document.addEventListener('DOMContentLoaded', () => {
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxVp_EvSdwaqsITX4OHVFERJ1ab7ic3jLeOoRYYbun0KZLFauTY5iu5mNgzoDhg2Hsc/exec';
  let exercises = [], week, day;
  let currentExercise = 0, currentSet = 1, currentRecTime = 0, timerInterval;

  const initCard   = document.getElementById('init-card');
  const selectCard = document.getElementById('select-card');
  const loading    = document.getElementById('loading-view');
  const denyCard   = document.getElementById('deny-card');
  const appCard    = document.getElementById('app-card');
  const listCard   = document.getElementById('list-card');

  function showView(view) {
    initCard.style.display   = view==='init'?   'block':'none';
    selectCard.style.display = view==='select'?'block':'none';
    loading.style.display    = view==='load'?   'block':'none';
    denyCard.style.display   = view==='deny'?   'block':'none';
    appCard.style.display    = view==='app'?    'block':'none';
    listCard.style.display   = view==='list'?'block':'none';
  }

  // LOGIN
  document.getElementById('login-btn').addEventListener('click', () => {
    const key = document.getElementById('key-input').value.trim();
    if (!key) return alert('Inserisci chiave');
    window.onAuth = res => {
      if (res.error==='Unauthorized') showView('deny');
      else showView('select');
    };
    const s = document.createElement('script');
    s.src = `${WEBAPP_URL}?callback=onAuth&key=${encodeURIComponent(key)}`;
    document.body.appendChild(s);
  });
  document.getElementById('retry-btn').addEventListener('click', () => location.reload());

  // SELEZIONE SETTIMANA/GIORNO
  document.getElementById('start-btn').addEventListener('click', () => {
    const keyVal = document.getElementById('key-input').value.trim();
    week = parseInt(document.getElementById('week-input').value,10);
    day  = document.getElementById('day-input').value;
    if (!week || !day) return alert('Inserisci settimana e giorno');
    fetchExercises(keyVal, week, day);
  });

  // NAVIGAZIONE
  document.getElementById('list-btn').addEventListener('click', () => showView('list'));
  document.getElementById('back-app-btn').addEventListener('click', () => showView('app'));
  document.getElementById('prev-set-btn').addEventListener('click', () => {
    if (currentSet > 1) { currentSet--; showExercise(); }
    else alert('Sei già alla prima serie');
  });
  document.getElementById('next-set-btn').addEventListener('click', () => {
    if (currentSet < exercises[currentExercise].seriePreviste) { currentSet++; showExercise(); }
    else alert('Sei già all\'ultima serie');
  });
  document.getElementById('prev-btn').addEventListener('click', goBackExercise);
  document.getElementById('skip-btn').addEventListener('click', skipExercise);
  document.getElementById('save-btn').addEventListener('click', submitSet);
  document.getElementById('reset-btn').addEventListener('click', resetAll);

  // FETCH ESERCIZI
  function fetchExercises(keyVal, wk, dy) {
    showView('load');
    window.onExercises = data => {
      if (data.error==='Unauthorized') return showView('deny');
      exercises = data;
      renderList();
      showView('app');
      showExercise();
    };
    const scr = document.createElement('script');
    scr.src = `${WEBAPP_URL}` +
      `?callback=onExercises` +
      `&key=${encodeURIComponent(keyVal)}` +
      `&settimana=${wk}` +
      `&giorno=${encodeURIComponent(dy)}`;
    document.body.appendChild(scr);
  }

  // RENDER LISTA
  function renderList() {
    const ul = document.getElementById('exercise-list');
    ul.innerHTML = '';
    exercises.forEach(ex => {
      const li = document.createElement('li');
      li.className = 'exercise-item';
      const nm = document.createElement('span');
      nm.textContent = ex.esercizio;
      const icon = document.createElement('span');
      icon.textContent = ex.done ? '✅' : '❌';
      li.append(nm, icon);
      ul.append(li);
    });
  }

  // MOSTRA ESERCIZIO
  function showExercise() {
    const ex = exercises[currentExercise];
  
    document.getElementById('week-display').textContent =
      `Settimana ${week}`;
    document.getElementById('exercise-counter').textContent =
      `Esercizio ${currentExercise + 1} di ${exercises.length}`;
    document.getElementById('exercise-name').textContent =
      ex.esercizio;
  
    // Caricamento immagine
    const img = document.getElementById('exercise-img');
    const fileName = ex.esercizio.trim()
      .replace(/\s+/g, '_') + '.jpg';
    img.src = `images/${fileName}`;
    img.onerror = () => { img.src = 'images/default.jpg'; };
    // Mostra le note (o "ND" se vuoto)
    const noteEl = document.getElementById('note-display');
    noteEl.textContent = `Note: ${ex.note.trim() || 'ND'}`;
    document.getElementById('prev-display').textContent =
      `Precedente: ${ex.prevData}`;
    document.getElementById('series-display').textContent =
      `Serie ${currentSet} di ${ex.seriePreviste}`;
  
    // Imposto il timer in millisecondi
    currentRecTime = (parseInt(ex.recTime, 10) || 60) * 1000;
  
    // **AGGIORNO LA LISTA** con ✅/❌
    renderList();
  }

  // SALVA SET
  function submitSet() {
    const peso = document.getElementById('weight').value;
    const reps = document.getElementById('reps').value;
    if (!peso || !reps) {
      return alert('Compila peso e ripetizioni');
    }
    const nuovo = confirm('Hai cambiato il peso?');
  
    window.onSave = res => {
      if (res.success) {
        // MARCO QUESTO ESERCIZIO COME FATTO
        exercises[currentExercise].done = true;
        renderList();
        // PARTO IL TIMER
        startTimer();
      } else {
        alert('Errore nel salvataggio');
      }
    };
  
    const s = document.createElement('script');
    s.src = `${WEBAPP_URL}` +
      `?callback=onSave` +
      `&key=${encodeURIComponent(document.getElementById('key-input').value)}` +
      `&settimana=${week}` +
      `&peso=${encodeURIComponent(peso)}` +
      `&reps=${encodeURIComponent(reps)}` +
      `&riga=${exercises[currentExercise].riga}` +
      `&nuovoPeso=${nuovo}`;
    document.body.appendChild(s);
  }

  // TIMER
  function startTimer() {
    clearInterval(timerInterval);
    document.getElementById('timer').style.display = 'block';
    const display = document.getElementById('countdown');
    const start = Date.now();
    timerInterval = setInterval(() => {
      const rem = Math.max(currentRecTime - (Date.now() - start), 0);
      const m = Math.floor(rem/60000);
      const s = Math.floor(rem/1000) % 60;
      const ms = rem % 1000;
      display.textContent =
        `${String(m).padStart(2,'0')}:` +
        `${String(s).padStart(2,'0')}.` +
        `${String(ms).padStart(3,'0')}`;
      if (rem <= 0) {
        clearInterval(timerInterval);
        nextExercise();
      }
    }, 33);
  }

  // PROSSIMO
  function nextExercise() {
    document.getElementById('timer').style.display = 'none';
    if (currentSet < exercises[currentExercise].seriePreviste) {
      currentSet++;
    } else {
      currentExercise++;
      currentSet = 1;
      if (currentExercise >= exercises.length) {
        return alert('🏁 Fine allenamento');
      }
    }
    showExercise();
  }

  // RESET TUTTO
  function resetAll() {
    if (!confirm('Annullare tutto l’allenamento?')) return;
    currentExercise = 0;
    currentSet = 1;
    fetchExercises(
      document.getElementById('key-input').value,
      week, day
    );
  }

  // SALTA ESERCIZIO
  function skipExercise() {
    if (currentExercise < exercises.length - 1) {
      currentExercise++;
      currentSet = 1;
      showExercise();
    } else alert('🏁 Fine allenamento');
  }

  // TORNA INDIETRO & CANCELLA
  function goBackExercise() {
    if (currentExercise === 0) {
      return alert('Primo esercizio');
    }
    if (!confirm('Cancellare il precedente?')) {
      return;
    }
  
    const prev = exercises[currentExercise - 1];
    window.onClear = res => {
      if (res.success) {
        // “Deseleziono” l’esercizio precedente
        exercises[currentExercise - 1].done = false;
        renderList();
        // Torno indietro e resetto la serie
        currentExercise--;
        currentSet = 1;
        showExercise();
      } else {
        alert('Errore nella cancellazione');
      }
    };
  
    const s = document.createElement('script');
    s.src = `${WEBAPP_URL}` +
      `?callback=onClear` +
      `&key=${encodeURIComponent(document.getElementById('key-input').value)}` +
      `&settimana=${week}` +
      `&clear=true` +
      `&riga=${prev.riga}`;
    document.body.appendChild(s);
  }

  // PARTENZA
  showView('init');
});
