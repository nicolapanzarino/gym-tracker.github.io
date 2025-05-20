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
  document.getElementById('skip-back-btn').addEventListener('click', () => {
    if (currentExercise>0) { currentExercise--; currentSet=1; refreshAndShow(); }
    else alert('Sei già al primo esercizio');
  });
  document.getElementById('prev-set-btn').addEventListener('click', () => {
    if (currentSet>1) { currentSet--; refreshAndShow(); }
    else alert('Sei già alla prima serie');
  });
  document.getElementById('prev-btn').addEventListener('click', goBackExercise);
  document.getElementById('next-set-btn').addEventListener('click', () => {
    if (currentSet<exercises[currentExercise].seriePreviste) { currentSet++; refreshAndShow(); }
    else alert('Sei già all\'ultima serie');
  });
  document.getElementById('skip-btn').addEventListener('click', () => {
    if (currentExercise<exercises.length-1) { currentExercise++; currentSet=1; refreshAndShow(); }
    else alert('🏁 Fine allenamento');
  });
  document.getElementById('save-btn').addEventListener('click', submitSet);
  document.getElementById('reset-btn').addEventListener('click', resetAll);

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

  function refreshAndShow() {
    fetchExercises();
  }

  function renderList() {
    const ul = document.getElementById('exercise-list'); ul.innerHTML='';
    exercises.forEach(ex => {
      const li = document.createElement('li'); li.className='exercise-item';
      const nm = document.createElement('span'); nm.textContent=ex.esercizio;
      const icon = document.createElement('span'); icon.textContent=ex.done?'✅':'❌';
      li.append(nm, icon); ul.append(li);
    });
  }

  function showExercise() {
    const ex = exercises[currentExercise];
    console.log('[showExercise] Dati esercizio:', ex);
    document.getElementById('week-display').textContent      = `Settimana ${week}`;
    document.getElementById('exercise-counter').textContent = `Esercizio ${currentExercise+1} di ${exercises.length}`;
    document.getElementById('exercise-name').textContent    = ex.esercizio;

    // immagine
    const img = document.getElementById('exercise-img');
    const fileName = ex.esercizio.trim().replace(/\s+/g,'_')+'.jpg';
    img.src = `images/${fileName}`; img.onerror = ()=>{img.src='images/default.jpg';};

    // note
    document.getElementById('note-display').textContent = `Note: ${ex.note||'ND'}`;

    // superset panel
    const sp = document.getElementById('superset-panel');
    if (ex.isSuperset) {
      sp.style.display='block';
      document.getElementById('sup-peso1').value = ex.lastPeso1||'';
      document.getElementById('sup-reps1').value = ex.lastReps1||'';
      document.getElementById('sup-peso2').value = ex.lastPeso2||'';
      document.getElementById('sup-reps2').value = ex.lastReps2||'';
    } else sp.style.display='none';

    document.getElementById('prev-display').textContent    = `Precedente: ${ex.prevData}`;
    document.getElementById('series-display').textContent  = `Serie ${currentSet} di ${ex.seriePreviste}`;
    currentRecTime = (parseInt(ex.recTime,10)||60)*1000;

    renderList();
  }

function submitSet() {
  console.log('[submitSet] Inizio funzione');

  const peso = document.getElementById('weight').value.trim();
  const reps = document.getElementById('reps').value.trim();
  console.log('[submitSet] Valori inseriti → peso:', peso, ', reps:', reps);

  if (!peso || !reps) {
    alert('Compila peso e ripetizioni');
    console.log('[submitSet] Terminato: peso o reps mancanti');
    return;
  }

  const esercizioCorrente = exercises[currentExercise];
  if (!esercizioCorrente || !esercizioCorrente.riga) {
    alert('Errore interno: dati esercizio mancanti');
    console.error('[submitSet] Terminato: esercizio o riga non definito');
    return;
  }

  window.onSave = res => {
    console.log('[submitSet] Callback onSave ricevuta:', res);
    if (res.success) {
      startTimer();
    } else {
      alert('Errore nel salvataggio');
    }
    console.log('[submitSet] Fine callback onSave');
  };

  const script = document.createElement('script');
  script.src = `${WEBAPP_URL}`
    + `?callback=onSave`
    + `&key=${encodeURIComponent(keyInput())}`
    + `&settimana=${week}`
    + `&peso=${encodeURIComponent(peso)}`
    + `&reps=${encodeURIComponent(reps)}`
    + `&riga=${esercizioCorrente.riga}`;
  
  document.body.appendChild(script);
  console.log('[submitSet] Script JSONP aggiunto al DOM:', script.src);
  console.log('[submitSet] Fine funzione');
}


  function startTimer() {
    clearInterval(timerInterval);
    document.getElementById('timer').style.display='block';
    const d = document.getElementById('countdown'), st=Date.now();
    timerInterval = setInterval(()=>{
      const rem = Math.max(currentRecTime-(Date.now()-st),0);
      const m=Math.floor(rem/60000), s=Math.floor(rem/1000)%60, ms=rem%1000;
      d.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
      if (rem<=0){ clearInterval(timerInterval); nextExercise(); }
    },33);
  }

  function nextExercise() {
    document.getElementById('timer').style.display='none';
    if (currentSet<exercises[currentExercise].seriePreviste) currentSet++;
    else { currentExercise++; currentSet=1; if (currentExercise>=exercises.length) return alert('🏁 Fine allenamento'); }
    showExercise();
  }

  function resetAll() {
    if (!confirm('Annullare tutto l’allenamento?')) return;
    currentExercise=0; currentSet=1; fetchExercises();
  }

  function skipExercise() {
    if (currentExercise<exercises.length-1) {
      currentExercise++; currentSet=1; showExercise();
    } else alert('🏁 Fine allenamento');
  }

  function goBackExercise() {
    if (currentExercise===0) return alert('Primo esercizio');
    if (!confirm('Cancellare il precedente?')) return;
    const prev = exercises[currentExercise-1];
    window.onClear = res => {
      if (res.success) {
        exercises[currentExercise-1].done=false;
        renderList();
        currentExercise--; currentSet=1; showExercise();
      } else alert('Errore cancellazione');
    };
    const s=document.createElement('script');
    s.src=`${WEBAPP_URL}?callback=onClear&key=${encodeURIComponent(keyInput())}`+
          `&settimana=${week}&clear=true&riga=${prev.riga}`;
    document.body.appendChild(s);
  }

  showView('init');
});