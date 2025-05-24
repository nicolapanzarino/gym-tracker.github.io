document.addEventListener('DOMContentLoaded', () => {
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxVp_EvSdwaqsITX4OHVFERJ1ab7ic3jLeOoRYYbun0KZLFauTY5iu5mNgzoDhg2Hsc/exec';
  let exercises = [], week, day;
  let currentExercise = 0, currentSet = 1, currentRecTime = 0, timerInterval;
  let waitingForSave = false;
  const keyInput = () => document.getElementById('key-input').value.trim();

  const initCard   = document.getElementById('init-card');
  const selectCard = document.getElementById('select-card');
  const loading    = document.getElementById('loading-view');
  const denyCard   = document.getElementById('deny-card');
  const appCard    = document.getElementById('app-card');
  const listCard   = document.getElementById('list-card');

  const showView = v => {
    initCard .style.display = v==='init' ? 'block':'none';
    selectCard.style.display = v==='select'?'block':'none';
    loading   .style.display = v==='load' ? 'block':'none';
    denyCard  .style.display = v==='deny' ? 'block':'none';
    appCard   .style.display = v==='app'  ? 'block':'none';
    listCard  .style.display = v==='list' ? 'block':'none';
  };

  document.getElementById('login-btn').addEventListener('click', () => {
    const key = keyInput();
    if (!key) return alert('Inserisci chiave');
    window.onAuth = r => r.error==='Unauthorized' ? showView('deny') : showView('select');
    const s = document.createElement('script');
    s.src = `${WEBAPP_URL}?callback=onAuth&key=${encodeURIComponent(key)}`;
    document.body.appendChild(s);
  });
  document.getElementById('retry-btn').addEventListener('click', () => location.reload());

  document.getElementById('start-btn').addEventListener('click', () => {
    week = parseInt(document.getElementById('week-input').value,10);
    day  = document.getElementById('day-input').value;
    if (!week || !day) return alert('Inserisci settimana e giorno');
    fetchExercises();
  });

  function fetchExercises() {
    showView('load');
    window.onExercises = data => {
      if (data.error==='Unauthorized') return showView('deny');
      exercises = data;
      renderList();
      showView('app');
      showExercise();
    };
    const s = document.createElement('script');
    s.src = `${WEBAPP_URL}?callback=onExercises`
          + `&key=${encodeURIComponent(keyInput())}`
          + `&settimana=${week}`
          + `&giorno=${encodeURIComponent(day)}`;
    document.body.appendChild(s);
  }

  function silentFetchExercises() {
    window.onSilentExercises = d => {
      if (d.error==='Unauthorized') return;
      exercises = d;
      renderList();
    };
    const s = document.createElement('script');
    s.src = `${WEBAPP_URL}?callback=onSilentExercises`
          + `&key=${encodeURIComponent(keyInput())}`
          + `&settimana=${week}`
          + `&giorno=${encodeURIComponent(day)}`;
    document.body.appendChild(s);
  }

  const deferFetch = () => requestAnimationFrame(silentFetchExercises);

  function renderList() {
    const ul = document.getElementById('exercise-list');
    ul.innerHTML = '';
    exercises.forEach(ex => {
      const li = document.createElement('li');
      li.className = 'exercise-item';
      li.innerHTML = `<span>${ex.esercizio}</span><span>${ex.done?'✅':'❌'}</span>`;
      ul.appendChild(li);
    });
  }

  function showExercise() {
    const ex = exercises[currentExercise];

    document.getElementById('week-display').textContent      = `Settimana ${week}`;
    document.getElementById('exercise-counter').textContent = `Esercizio ${currentExercise+1} di ${exercises.length}`;
    document.getElementById('exercise-name').textContent    = ex.esercizio;

    const img = document.getElementById('exercise-img');
    img.src = `images/${ex.esercizio.trim().replace(/\s+/g,'_')}.jpg`;
    img.onerror = () => img.src='images/default.jpg';

    document.getElementById('note-display').textContent = ex.note ? `Note: ${ex.note}` : 'Note: nessuna nota presente';

  const parts = [];
  if (ex.pesoPrecedente) {
    parts.push(`<div class="peso-info peso-precedente"><span>Peso precedente:</span><span>${ex.pesoPrecedente}</span></div>`);
  }
  if (ex.pesoRaccomandato) {
    parts.push(`<div class="peso-info peso-raccomandato"><span>Peso raccomandato:</span><span>${ex.pesoRaccomandato}</span></div>`);
  }

  if (ex.pesoPrecedente) {
    const match = ex.pesoPrecedente.match(/(\d+)/); // ✅ CORRETTO
    if (match) {
      const warmupKg = Math.round(parseInt(match[1], 10) / 2);
      const warmupText = `${warmupKg} Kg`;
      parts.push(`<div class="peso-info peso-riscaldamento"><span>Peso riscaldamento:</span><span>${warmupText}</span></div>`);
    }
  }

  document.getElementById('prev-display').innerHTML = parts.join('');

    document.getElementById('series-display').textContent = `Serie ${currentSet} di ${ex.seriePreviste}`;
    currentRecTime = (parseInt(ex.recTime,10)||60)*1000;

    renderList();
  }

  function advanceExercise() {
    if (currentSet < exercises[currentExercise].seriePreviste) {
      currentSet++;
    } else {
      currentExercise++;
      currentSet = 1;
    }
  }

  document.getElementById('next-set-btn').addEventListener('click', () => {
    if (currentSet < exercises[currentExercise].seriePreviste) {
      currentSet++; showExercise(); deferFetch();
    } else alert('Sei già all\'ultima serie');
  });

  document.getElementById('prev-set-btn').addEventListener('click', () => {
    if (currentSet > 1) {
      currentSet--; showExercise(); deferFetch();
    } else alert('Sei già alla prima serie');
  });

  document.getElementById('skip-btn').addEventListener('click', () => {
    if (currentExercise < exercises.length-1) {
      currentExercise++; currentSet=1;
      showExercise(); deferFetch();
    } else alert('🏁 Fine allenamento');
  });

  document.getElementById('skip-back-btn').addEventListener('click', () => {
    if (currentExercise > 0) {
      currentExercise--; currentSet=1;
      showExercise(); deferFetch();
    } else alert('Sei già al primo esercizio');
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentExercise===0) return alert('Primo esercizio');
    if (!confirm('Cancellare il precedente?')) return;
    const prev = exercises[currentExercise-1];
    window.onClear = r => {
      if (r.success) {
        exercises[currentExercise-1].done=false;
        currentExercise--; currentSet=1;
        showExercise(); deferFetch();
      } else alert('Errore cancellazione');
    };
    const s=document.createElement('script');
    s.src = `${WEBAPP_URL}?callback=onClear`
        + `&key=${encodeURIComponent(keyInput())}`
        + `&settimana=${week}&clear=true&riga=${prev.riga}`;
    document.body.appendChild(s);
  });

document.getElementById('save-btn').addEventListener('click', submitSet);

function submitSet() {
  const peso = document.getElementById('weight').value.trim();
  const reps = document.getElementById('reps').value.trim();

  if (!peso || !reps) {
    alert('Compila peso e ripetizioni');
    return;
  }

  if (waitingForSave) {
    alert('Attendere il salvataggio precedente...');
    return;
  }

  const exCurr = exercises[currentExercise];

  if (!exCurr || !exCurr.riga) {
    console.error('Errore interno: dati esercizio non validi', exCurr);
    alert('Errore interno: esercizio non definito correttamente.');
    return;
  }

  waitingForSave = true;

  const timeout = setTimeout(() => {
    if (waitingForSave) {
      waitingForSave = false;
      alert('Timeout: riprova il salvataggio.');
    }
  }, 10000);

  const isFirst = currentSet === 1;
  window.onSave = r => {
    clearTimeout(timeout);
    waitingForSave = false;

    if (r.success) {
      advanceExercise();
      showExercise();
      deferFetch();
      startTimer();
    } else {
      console.error('Errore salvataggio:', r);
      alert(`Errore salvataggio: ${r.error || 'Problema sconosciuto'}`);
    }
  };

  const params = [
    `callback=onSave`,
    `key=${encodeURIComponent(keyInput())}`,
    `settimana=${week}`,
    `peso=${encodeURIComponent(peso)}`,
    `reps=${encodeURIComponent(reps)}`,
    `riga=${exCurr.riga}`,
    isFirst ? 'firstSet=1' : null
  ].filter(Boolean).join('&');

  const s = document.createElement('script');
  s.onerror = () => {
    clearTimeout(timeout);
    waitingForSave = false;
    alert('Errore caricamento script. Verifica la connessione.');
  };
  s.src = `${WEBAPP_URL}?${params}`;
  document.body.appendChild(s);
}

  function startTimer() {
    clearInterval(timerInterval);
    document.getElementById('timer').style.display='block';
    const d=document.getElementById('countdown'), start=Date.now();
    timerInterval=setInterval(()=>{
      const rem=Math.max(currentRecTime-(Date.now()-start),0);
      const m=Math.floor(rem/60000), s=Math.floor(rem/1000)%60, ms=rem%1000;
      d.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
      if (rem<=0) {
        clearInterval(timerInterval);
        document.getElementById('timer').style.display='none';
      }
    },33);
  }

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('Annullare tutto l’allenamento?')) return;
    currentExercise=0; currentSet=1; fetchExercises();
  });

  document.getElementById('list-btn').addEventListener('click', () => showView('list'));
  document.getElementById('back-app-btn').addEventListener('click', () => showView('app'));

  showView('init');
});
