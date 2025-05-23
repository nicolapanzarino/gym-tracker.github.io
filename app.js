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
    if (ex.pesoPrecedente)   parts.push(`<strong>Peso precedente:</strong> ${ex.pesoPrecedente}`);
    if (ex.pesoRaccomandato) parts.push(`<strong>Peso raccomandato:</strong> ${ex.pesoRaccomandato}`);

    // Calcolo peso riscaldamento consigliato
    let warmupText = '';
    if (ex.pesoPrecedente) {
      const match = ex.pesoPrecedente.match(/(\d+)/);
      if (match) {
        const warmupKg = Math.round(parseInt(match[1], 10) / 2);
        warmupText = `<strong>Peso riscaldamento:</strong> ${warmupKg} Kg`;
        parts.push(warmupText);
      }
    }

    document.getElementById('prev-display').innerHTML = parts.join('<br>');

    document.getElementById('series-display').textContent = `Serie ${currentSet} di ${ex.seriePreviste}`;
    currentRecTime = (parseInt(ex.recTime,10)||60)*1000;

    renderList();
  }
