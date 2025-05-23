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

    document.getElementById('login-btn')?.addEventListener('click', () => {
    const key = keyInput();
    if (!key) return alert('Inserisci chiave');
    window.onAuth = r => r.error === 'Unauthorized' ? showView('deny') : showView('select');
    const s = document.createElement('script');
    s.src = `${WEBAPP_URL}?callback=onAuth&key=${encodeURIComponent(key)}`;
    document.body.appendChild(s);
  });

  document.getElementById('retry-btn')?.addEventListener('click', () => location.reload());
  document.getElementById('start-btn')?.addEventListener('click', () => {
    week = parseInt(document.getElementById('week-input').value, 10);
    day  = document.getElementById('day-input').value;
    if (!week || !day) return alert('Inserisci settimana e giorno');
    fetchExercises();
  });
  function showExercise() {
    const ex = exercises[currentExercise];

    document.getElementById('week-display').textContent      = `Settimana ${week}`;
    document.getElementById('exercise-counter').textContent = `Esercizio ${currentExercise+1} di ${exercises.length}`;
    document.getElementById('exercise-name').textContent    = ex.esercizio;

    const img = document.getElementById('exercise-img');
    img.src = `images/${ex.esercizio.trim().replace(/\s+/g,'_')}.jpg`;
    img.onerror = () => img.src='images/default.jpg';

    document.getElementById('note-display').textContent = ex.note ? `Note: ${ex.note}` : 'Note: nessuna nota presente';

    const sp = document.getElementById('superset-panel');
    if (ex.isSuperset) {
      sp.style.display='block';
      ['1','2'].forEach(n=>{
        document.getElementById(`sup-peso${n}`).value = ex[`lastPeso${n}`] || '';
        document.getElementById(`sup-reps${n}`).value = ex[`lastReps${n}`] || '';
      });
    } else sp.style.display='none';

    const parts = [];
    if (ex.pesoPrecedente) {
      parts.push(`<div class="peso-info peso-precedente"><span>Peso precedente:</span><span>${ex.pesoPrecedente}</span></div>`);
    }

    if (ex.pesoRaccomandato) {
      const match = ex.pesoRaccomandato.match(/(\d+)/);
      const raccom = match ? `${match[1]} Kg` : ex.pesoRaccomandato;
      parts.push(`<div class="peso-info peso-raccomandato"><span>Peso raccomandato:</span><span>${raccom}</span></div>`);
    }

    if (ex.pesoPrecedente) {
      const match = ex.pesoPrecedente.match(/(\d+)/);
      if (match) {
        const warmupKg = Math.round(parseInt(match[1], 10) / 2);
        parts.push(`<div class="peso-info peso-riscaldamento"><span>Peso riscaldamento:</span><span>${warmupKg} Kg</span></div>`);
      }
    }

    document.getElementById('prev-display').innerHTML = parts.join('');
    document.getElementById('series-display').textContent = `Serie ${currentSet} di ${ex.seriePreviste}`;
    currentRecTime = (parseInt(ex.recTime,10)||60)*1000;
    renderList();
  }

    document.getElementById('save-btn')?.addEventListener('click', submitSet);
  function submitSet() {
    const peso = document.getElementById('weight').value.trim();
    const reps = document.getElementById('reps').value.trim();
    const saveBtn = document.getElementById('save-btn');
    const savingMsg = document.getElementById('saving-indicator');

    if (!peso || !reps) return alert('Compila peso e ripetizioni');

    if (waitingForSave) {
      alert('Attendere il salvataggio precedente...');
      return;
    }
    waitingForSave = true;
    if (saveBtn) saveBtn.disabled = true;
    if (savingMsg) savingMsg.style.display = 'inline';

    const exCurr = exercises[currentExercise];
    if (!exCurr || !exCurr.riga) return alert('Errore interno');

    const isFirst = currentSet === 1;
    window.onSave = r => {
      waitingForSave = false;
      if (saveBtn) saveBtn.disabled = false;
      if (savingMsg) savingMsg.style.display = 'none';

      if (r.success) {
        advanceExercise();
        showExercise();
        deferFetch();
        startTimer();
      } else alert('Errore salvataggio');
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
    s.src = `${WEBAPP_URL}?${params}`;
    document.body.appendChild(s);
  }

  function startTimer() {
    clearInterval(timerInterval);
    document.getElementById('timer').style.display = 'block';
    const d = document.getElementById('countdown'), start = Date.now();
    timerInterval = setInterval(() => {
      const rem = Math.max(currentRecTime - (Date.now() - start), 0);
      const m = Math.floor(rem / 60000), s = Math.floor(rem / 1000) % 60, ms = rem % 1000;
      d.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
      if (rem <= 0) {
        clearInterval(timerInterval);
        document.getElementById('timer').style.display = 'none';
      }
    }, 33);
  }

  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (!confirm('Annullare tutto l’allenamento?')) return;
    currentExercise = 0;
    currentSet = 1;
    fetchExercises();
  });

  showView('init');
});