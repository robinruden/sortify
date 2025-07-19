// src/renderer.js
const { ipcRenderer } = require('electron');
const PreviewPlayer = require('./src/previewPlayer.js');
/* const { pathToFileURL } = require('url'); */

let allAnalyzedFiles = [];

const player = new PreviewPlayer();

// Render a list of files
function renderFileList(files) {
  const output = document.getElementById('output');
  output.innerHTML = '';

  files.forEach(file => {
    const filename = file.path.split(/[/\\]/).pop();
    const durText  = file.duration != null
      ? `${file.duration.toFixed(1)} s`
      : '–';

    const el = document.createElement('div');
    el.className = 'file-item';
    el.textContent =
      `${filename} — Längd: ${durText}, BPM: ${file.bpm?.toFixed(1) ?? '–'}, ` +
      `${file.key ?? '–'} ${file.scale ?? ''}, Energi: ${file.energy?.toFixed(2) ?? '–'}`;
    el.draggable = true;
    el.dataset.path = file.path;

    // Drag to reveal in Finder/Explorer
    el.addEventListener('dragstart', e => {
      e.preventDefault();
      ipcRenderer.invoke('ondragstart', file.path);
    });

    // Right-click to toggle preview
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      const volume = parseInt(
        document.getElementById('volume-slider').value,
        10
      ) / 100;
      player.toggle(file.path, el, volume);
    });

    output.appendChild(el);
  });
}


// Fetch and filter
async function loadAllTracks() {
  allAnalyzedFiles = await ipcRenderer.invoke('get-all-tracks');
  applyFilter();
}

// Apply filters and render list
function applyFilter() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const keyTerm    = document.getElementById('key').value.toLowerCase();
  const scaleTerm  = document.getElementById('scale').value.toLowerCase();

  const bpmSliderEl = document.getElementById('bpm-slider');
  const [bpmMin, bpmMax] = bpmSliderEl
    ? bpmSliderEl.noUiSlider.get().map(v => parseInt(v, 10))
    : [0, 300];

  const bpmMode    = document.querySelector('input[name="bpm-mode"]:checked').value;
  const exactInput = parseInt(document.getElementById('bpmExact').value, 10);

  const energySliderEl = document.getElementById('energy-slider');
  const energyThreshold = energySliderEl
    ? parseFloat(energySliderEl.value)
    : 0;
  const lengthSliderEl = document.getElementById('max-length-slider');
  const lengthMax = lengthSliderEl
    ? parseFloat(lengthSliderEl.value)
    : Infinity;

  const filtered = allAnalyzedFiles.filter(file => {
    const name = file.path.split(/[/\\]/).pop().toLowerCase();
    const dur  = file.duration;

    const okName  = !searchTerm || name.includes(searchTerm);
    const okKey   = !keyTerm   || file.key?.toLowerCase() === keyTerm;
    const okScale = !scaleTerm || file.scale?.toLowerCase() === scaleTerm;

    let okBpm = true;
    if (bpmMode === 'range') {
      okBpm = file.bpm == null || (file.bpm >= bpmMin && file.bpm <= bpmMax);
    } else {
      okBpm = isNaN(exactInput)
        ? true
        : file.bpm == null || Math.round(file.bpm) === exactInput;
    }

    const okEnergy = file.energy == null || file.energy >= energyThreshold;
    const okLength = dur == null || dur <= lengthMax;

    return okName && okKey && okScale && okBpm && okEnergy && okLength;
  });

  renderFileList(filtered);
}

window.applyFilter = applyFilter;

document.addEventListener('DOMContentLoaded', () => {
  // ----- Slider & filter initialization -----
  const bpmSlider = document.getElementById('bpm-slider');
  noUiSlider.create(bpmSlider, {
    start: [0, 300], connect: true,
    range: { min: 0, max: 300 }, step: 1,
    tooltips: [true, true],
    format: { to: v => parseInt(v, 10), from: v => parseInt(v, 10) }
  });
  const bpmMinLabel = document.getElementById('bpm-min-val');
  const bpmMaxLabel = document.getElementById('bpm-max-val');
  bpmSlider.noUiSlider.on('update', ([min, max]) => {
    bpmMinLabel.textContent = min;
    bpmMaxLabel.textContent = max;
    applyFilter();
  });

  document.querySelectorAll('input[name="bpm-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isRange = radio.value === 'range';
      document.getElementById('bpm-range-controls').classList.toggle('hidden', !isRange);
      document.getElementById('bpm-exact-controls').classList.toggle('hidden', isRange);
      applyFilter();
    });
  });
  document.getElementById('bpmExact').addEventListener('input', applyFilter);

  const energySlider = document.getElementById('energy-slider');
  const energyLabel  = document.getElementById('energy-val');
  if (energySlider && energyLabel) {
    energySlider.addEventListener('input', e => {
      energyLabel.textContent = parseFloat(e.target.value).toFixed(2);
      applyFilter();
    });
  }

  const lengthSlider = document.getElementById('max-length-slider');
  const lengthLabel  = document.getElementById('length-max-val');
  lengthSlider.addEventListener('input', e => {
    const num = parseFloat(e.target.value);
    lengthLabel.textContent = (num === parseFloat(lengthSlider.max)) ? '∞' : num.toFixed(1);
    applyFilter();
  });

  ['search','key','scale'].forEach(id =>
    document.getElementById(id).addEventListener('input', applyFilter)
  );

  document.getElementById('reset-filters').addEventListener('click', () => {
    document.getElementById('search').value = '';
    document.getElementById('key').value = '';
    document.getElementById('scale').value = '';
    bpmSlider.noUiSlider.set([0,300]);
    document.getElementById('bpmExact').value = '';
    document.querySelector('input[name="bpm-mode"][value="range"]').checked = true;
    document.getElementById('bpm-range-controls').classList.remove('hidden');
    document.getElementById('bpm-exact-controls').classList.add('hidden');
    energySlider.value = 0;
    energyLabel.textContent = '0.00';
    lengthSlider.value = lengthSlider.max;
    lengthLabel.textContent = '∞';
    loadAllTracks();
  });
  document.getElementById('clear-db').addEventListener('click', async () => {
    const res = await ipcRenderer.invoke('clear-database');
    if (!res.error) loadAllTracks();
  });

  // ----- Spinner CSS -----
  const style = document.createElement('style');
  style.textContent = `
      #drop-overlay .spinner {
    display: inline-block;
    width: 24px; height: 24px;
    border: 3px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
  }
  #drop-overlay .percent {
    font-weight: bold;
    margin-left: 4px;
  }
  `;
  document.head.appendChild(style);

  // Progress elements
  const progressContainer = document.getElementById('progress-container');
  const progressBar       = document.getElementById('progress-bar');
  const progressText      = document.getElementById('progress-text');
  const processedList     = document.getElementById('processed-list');

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'drop-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: '1.5rem', pointerEvents: 'none', opacity: '0', transition: 'opacity 0.2s', zIndex: '9999'
  });
  document.body.appendChild(overlay);

  function showSpinnerOverlay() {
    overlay.innerHTML = '<span class="spinner"></span> Analyzing…';
    overlay.style.pointerEvents = 'auto'; overlay.style.opacity = '1';
  }
  function showDoneOverlay(count) {
    overlay.innerHTML = `✅ Analyzed ${count} files`;
    overlay.style.pointerEvents = 'auto'; overlay.style.opacity = '1';
    setTimeout(hideOverlay, 1500);
  }
  function hideOverlay() { overlay.style.pointerEvents = 'none'; overlay.style.opacity = '0'; }

  ['dragenter','dragover'].forEach(evt =>
    window.addEventListener(evt, e => {
      if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; showSpinnerOverlay(); }
    })
  );
  window.addEventListener('dragleave', e => { e.preventDefault(); hideOverlay(); });
  window.addEventListener('drop', async e => {
    e.preventDefault(); showSpinnerOverlay();
    const items = Array.from(e.dataTransfer.items || []).filter(i => i.kind==='file');
    if (!items.length) { hideOverlay(); return; }
    const folders = items.map(item=>item.webkitGetAsEntry?.()).filter(en=>en?.isDirectory).map((en,i)=>items[i].getAsFile().path);
    try {
      const result = await ipcRenderer.invoke('drop-and-analyze-folders-with-progress', folders);
      await loadAllTracks(); showDoneOverlay(result.analyzed.length);
    } catch(err) {
      console.error('Analysis error:', err); hideOverlay();
    }
  });

  // Progress-update handler
  ipcRenderer.on('progress-update', (_, { percent, current }) => {
    if (percent===0) { progressContainer.classList.remove('hidden'); processedList.innerHTML=''; }
    progressBar.value=percent;
    progressText.textContent=`Analyserar: ${current.split(/[/\\]/).pop()} (${percent}%)`;
    if (percent>0 && percent<100) {
      const li=document.createElement('li'); li.textContent=current.split(/[/\\]/).pop(); processedList.appendChild(li);
    }
    if (percent===100) setTimeout(()=>progressContainer.classList.add('hidden'),1500);
  }); 

  // Volume slider
const volumeSlider = document.getElementById('volume-slider');
const volumeLabel  = document.getElementById('volume-val');
if (volumeSlider && volumeLabel) {
  volumeSlider.addEventListener('input', e => {
    const v = parseInt(e.target.value, 10);
    volumeLabel.textContent = `${v}%`;
    // Tell our PreviewPlayer to update its volume
    player.setVolume(v / 100);
  });
}

  // Initial load
  loadAllTracks();
});

