document.addEventListener('DOMContentLoaded', () => {
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxVp_EvSdwaqsITX4OHVFERJ1ab7ic3jLeOoRYYbun0KZLFauTY5iu5mNgzoDhg2Hsc/exec';
  let exercises = [], week, day;
  let currentExercise = 0, currentSet = 1, currentRecTime = 0, timerInterval;
  const keyInput = () => document.getElementById('key-input').value.trim();

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
    const key = keyInput();
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
    week = parseInt(document.getElementById('week-input').value,10);
    day  = document.getElementById('day-input').value;
    if (!week||!day) return alert('Inserisci settimana e giorno');
    fetchExercises();
  });

  // NAVIGAZIONE
  document.getElementById('list-btn').addEventListener('click', () => showView('list'));
  document.getElementById('back-app-btn').addEventListener('click', () => showView('app'));

  // Silenziosa: aggiorna solo dati + lista, senza cambiare vista
  function silentFetchExercises() {
    window.onExercises = data => {
      if (data.error==='Unauthorized') return;
      exercises = data;
      renderList();
    };
    const scr = document.createElement('script');
    scr.src = `${WEBAPP_URL}`
      + `?callback=onExercises`
      + `&key=${encodeURIComponent(keyInput())}`
      + `&settimana=${week}`
      + `&giorno=${encodeURIComponent(day)}`;
    document.body.appendChild(scr);
  }

  // Fetch completa (mostra loading → app)
  function fetchExercises() {
    showView('load');
    window.onExercises = data => {
      if (data.error==='Unauthorized') return showView('deny');
      exercises = data;
      renderList();
      showView('app');
      showExercise();
    };
    const scr = document.createElement('script');
    scr.src = `${WEBAPP_URL}`
      + `?callback=onExercises`
      + `&key=${encodeURIComponent(keyInput())}`
      + `&settimana=${week}`
      + `&giorno=${encodeURIComponent(day)}`;
    document.body.appendChild(scr);
  }

  // Lista laterale
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

  // Mostra esercizio/serie
  function showExercise() {
    const ex = exercises[currentExercise];

    document.getElementById('week-display').textContent      = `Settimana ${week}`;
    document.getElementById('exercise-counter').textContent = `Esercizio ${currentExercise + 1} di ${exercises.length}`;
    document.getElementById('exercise-name').textContent    = ex.esercizio;

    const img = document.getElementById('exercise-img');
    const fileName = ex.esercizio.trim().replace(/\s+/g,'_') + '.jpg';
    img.src = `images/${fileName}`;
    img.onerror = () => img.src = 'images/default.jpg';

    document.getElementById('note-display').textContent = `Note: ${ex.note || 'ND'}`;

    const sp = document.getElementById('superset-panel');
    if (ex.isSuperset) {
      sp.style.display = 'block';
      document.getElementById('sup-peso1').value = ex.lastPeso1 || '';
      document.getElementById('sup-reps1').value = ex.lastReps1 || '';
      document.getElementById('sup-peso2').value = ex.lastPeso2 || '';
      document.getElementById('sup-reps2').value = ex.lastReps2 || '';
    } else {
      sp.style.display = 'none';
    }

    const parts = [];
    if (ex.pesoPrecedente)   parts.push(`Peso precedente: ${ex.pesoPrecedente}`);
    if (ex.pesoRaccomandato) parts.push(`Peso raccomandato: ${ex.pesoRaccomandato}`);
    document.getElementById('prev-display').innerHTML = parts.join('<br>');

    document.getElementById('series-display').textContent = `Serie ${currentSet} di ${ex.seriePreviste}`;
    currentRecTime = (parseInt(ex.recTime, 10) || 60) * 1000;

    renderList();
  }

  // NAVIGATORI con fetch silenziosa
  document.getElementById('next-set-btn').addEventListener('click', () => {
    if (currentSet < exercises[currentExercise].seriePreviste) {
      currentSet++;
      showExercise();
      silentFetchExercises();
    } else {
      alert('Sei già all\'ultima serie');
    }
  });

  document.getElementById('prev-set-btn').addEventListener('click', () => {
    if (currentSet > 1) {
      currentSet--;
      showExercise();
      silentFetchExercises();
    } else {
      alert('Sei già alla prima serie');
    }
  });

  document.getElementById('skip-btn').addEventListener('click', () => {
    if (currentExercise < exercises.length - 1) {
      currentExercise++;
      currentSet = 1;
      showExercise();
      silentFetchExercises();
    } else {
      alert('🏁 Fine allenamento');
    }
  });

  document.getElementById('skip-back-btn').addEventListener('click', () => {
    if (currentExercise > 0) {
      currentExercise--;
      currentSet = 1;
      showExercise();
      silentFetchExercises();
    } else {
      alert('Sei già al primo esercizio');
    }
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentExercise === 0) return alert('Primo esercizio');
    if (!confirm('Cancellare il precedente?')) return;
    const prev = exercises[currentExercise - 1];
    window.onClear = res => {
      if (res.success) {
        exercises[currentExercise - 1].done = false;
        currentExercise--;
        currentSet = 1;
        showExercise();
        silentFetchExercises();
      } else {
        alert('Errore cancellazione');
      }
    };
    const s = document.createElement('script');
    s.src = `${WEBAPP_URL}?callback=onClear`
      + `&key=${encodeURIComponent(keyInput())}`
      + `&settimana=${week}&clear=true&riga=${prev.riga}`;
    document.body.appendChild(s);
  });

  document.getElementById('save-btn').addEventListener('click', submitSet);
  document.getElementById('reset-btn').addEventListener('click', resetAll);

  // Funzione submitSet e startTimer restano invariate…

  function submitSet() { /* … */ }
  function startTimer() { /* … */ }
  function resetAll() { /* … */ }
  function goBackExercise() { /* … */ }

  showView('init');
});