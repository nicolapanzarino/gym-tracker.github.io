document.addEventListener('DOMContentLoaded', () => {
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxVp_EvSdwaqsITX4OHVFERJ1ab7ic3jLeOoRYYbun0KZLFauTY5iu5mNgzoDhg2Hsc/exec';
  let exercises = [], week, day;
  let currentExercise = 0, currentSet = 1, currentRecTime = 0, timerInterval;
  let waitingForSave = false;

  const keyInput = () => document.getElementById('key-input').value.trim();

  const showView = v => {
    const views = {
      init: 'init-card',
      select: 'select-card',
      load: 'loading-view',
      deny: 'deny-card',
      app: 'app-card',
      list: 'list-card'
    };
    Object.entries(views).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = v === key ? 'block' : 'none';
    });
  };

  function loadScript(src) {
    const s = document.createElement('script');
    s.onerror = () => alert('Errore caricamento script. Controlla connessione.');
    s.src = src;
    document.body.appendChild(s);
  }

  document.getElementById('login-btn').addEventListener('click', () => {
    const key = keyInput();
    if (!key) return alert('Inserisci chiave');
    window.onAuth = r => showView(r.error === 'Unauthorized' ? 'deny' : 'select');
    loadScript(`${WEBAPP_URL}?callback=onAuth&key=${encodeURIComponent(key)}`);
  });

  document.getElementById('retry-btn').addEventListener('click', () => location.reload());
  document.getElementById('start-btn').addEventListener('click', () => {
    week = parseInt(document.getElementById('week-input').value, 10);
    day = document.getElementById('day-input').value;
    if (!week || !day) return alert('Inserisci settimana e giorno');
    fetchExercises();
  });

  function fetchExercises() {
    showView('load');
    window.onExercises = data => {
      if (data.error === 'Unauthorized') return showView('deny');
      if (!Array.isArray(data)) {
        console.error('Formato dati non valido:', data);
        alert('Errore nei dati ricevuti.');
        return showView('select');
      }
      exercises = data;
      currentExercise = 0;
      currentSet = 1;
      renderList();
      showExercise();
      showView('app');
    };
    loadScript(`${WEBAPP_URL}?callback=onExercises&key=${encodeURIComponent(keyInput())}&settimana=${week}&giorno=${encodeURIComponent(day)}`);
  }

  function renderList() {
    const ul = document.getElementById('exercise-list');
    ul.innerHTML = exercises.map(ex =>
      `<li class="exercise-item"><span>${ex.esercizio}</span><span>${ex.done ? '✅' : '❌'}</span></li>`
    ).join('');
  }

  function showExercise() {
    const ex = exercises[currentExercise];
    if (!ex) return alert('Allenamento terminato o dati mancanti.');

    // Dati principali
    document.getElementById('week-display').textContent = `Settimana ${week}`;
    document.getElementById('exercise-counter').textContent = `Esercizio ${currentExercise + 1} di ${exercises.length}`;
    document.getElementById('exercise-name').textContent = ex.esercizio;
    document.getElementById('exercise-img').src = `images/${ex.esercizio.trim().replace(/\s+/g, '_')}.jpg`;
    document.getElementById('note-display').textContent = ex.note ? `Note: ${ex.note}` : 'Note: nessuna nota presente';

    // Peso precedente, raccomandato e riscaldamento
    const parts = [];
    if (ex.pesoPrecedente) {
      parts.push(`<div class="peso-info peso-precedente"><span>Peso precedente:</span><span>${ex.pesoPrecedente}</span></div>`);
      const match = ex.pesoPrecedente.match(/(\d+)/);
      if (match) {
        const warmupKg = Math.round(parseInt(match[1], 10) / 2);
        parts.push(`<div class="peso-info peso-riscaldamento"><span>Peso riscaldamento:</span><span>${warmupKg} Kg</span></div>`);
      }
    }

    if (ex.pesoRaccomandato) {
      const matchRec = ex.pesoRaccomandato.match(/(\d+)/);
      const recKg = matchRec ? `${matchRec[1]} Kg` : ex.pesoRaccomandato;
      parts.push(`<div class="peso-info peso-raccomandato"><span>Peso raccomandato:</span><span>${recKg}</span></div>`);
    }

    document.getElementById('prev-display').innerHTML = parts.join('');
    document.getElementById('series-display').textContent = `Serie ${currentSet} di ${ex.seriePreviste}`;
    currentRecTime = (parseInt(ex.recTime, 10) || 60) * 1000;
    renderList();
  }

  function submitSet() {
    const peso = document.getElementById('weight').value.trim();
    const reps = document.getElementById('reps').value.trim();
    if (!peso || !reps) return alert('Compila peso e ripetizioni');
    if (waitingForSave) return alert('Attendere il salvataggio precedente...');
    const exCurr = exercises[currentExercise];
    if (!exCurr || !exCurr.riga) {
      console.error('Errore interno esercizio:', exCurr);
      return alert('Errore interno: esercizio non definito.');
    }
    waitingForSave = true;
    const timeout = setTimeout(() => {
      waitingForSave = false;
      alert('Timeout salvataggio, riprova.');
    }, 10000);
    window.onSave = r => {
      clearTimeout(timeout);
      waitingForSave = false;
      if (r.success) {
        const prevExercise = currentExercise;
        advanceExercise();
        showExercise();
        if (currentExercise === prevExercise && currentSet !== 1) startTimer();
      } else {
        alert(`Errore salvataggio: ${r.error || 'Sconosciuto'}`);
      }
    };
    const params = `callback=onSave&key=${encodeURIComponent(keyInput())}&settimana=${week}&peso=${encodeURIComponent(peso)}&reps=${encodeURIComponent(reps)}&riga=${exCurr.riga}&firstSet=${currentSet === 1 ? 1 : 0}`;
    loadScript(`${WEBAPP_URL}?${params}`);
  }

  function advanceExercise() {
    if (currentSet < exercises[currentExercise].seriePreviste) {
      currentSet++;
    } else {
      currentExercise++;
      currentSet = 1;
    }
  }

  function startTimer() {
    clearInterval(timerInterval);
    const timerEl = document.getElementById('timer');
    const countdown = document.getElementById('countdown');
    timerEl.style.display = 'block';
    const end = Date.now() + currentRecTime;
    timerInterval = setInterval(() => {
      const rem = end - Date.now();
      if (rem <= 0) {
        clearInterval(timerInterval);
        timerEl.style.display = 'none';
        return;
      }
      const m = String(Math.floor(rem / 60000)).padStart(2, '0');
      const s = String(Math.floor((rem % 60000) / 1000)).padStart(2, '0');
      const ms = String(rem % 1000).padStart(3, '0');
      countdown.textContent = `${m}:${s}.${ms}`;
    }, 33);
  }

  // Navigation buttons
  document.getElementById('next-set-btn').addEventListener('click', () => {
    if (currentSet < exercises[currentExercise].seriePreviste) {
      currentSet++;
      showExercise();
    } else alert('Sei già all\'ultima serie');
  });

  document.getElementById('prev-set-btn').addEventListener('click', () => {
    if (currentSet > 1) {
      currentSet--;
      showExercise();
    } else alert('Sei già alla prima serie');
  });

  document.getElementById('skip-btn').addEventListener('click', () => {
    if (currentExercise < exercises.length - 1) {
      currentExercise++;
      currentSet = 1;
      showExercise();
    } else alert('🏁 Fine allenamento');
  });

  document.getElementById('skip-back-btn').addEventListener('click', () => {
    if (currentExercise > 0) {
      currentExercise--;
      currentSet = 1;
      showExercise();
    } else alert('Primo esercizio');
  });

  document.getElementById('save-btn').addEventListener('click', submitSet);
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Annullare tutto l’allenamento?')) {
      currentExercise = 0;
      currentSet = 1;
      fetchExercises();
    }
  });
  document.getElementById('list-btn').addEventListener('click', () => showView('list'));
  document.getElementById('back-app-btn').addEventListener('click', () => showView('app'));

  showView('init');
});
