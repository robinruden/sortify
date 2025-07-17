// src/renderer.js
const { ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');

let allAnalyzedFiles = [];
let currentPlayer = null;
let currentPlayerPath = null;
let currentPlayerElement = null;

// Render a list of files
function renderFileList(files) {
  const output = document.getElementById('output');
  output.innerHTML = '';

  files.forEach(file => {
    const filename = file.path.split(/[/\\]/).pop();
    const durText = file.duration != null
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

    // Right-click to preview or stop
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      // Stop if same file clicked
      if (currentPlayer && currentPlayerPath === file.path) {
        currentPlayer.pause();
        currentPlayer.currentTime = 0;
        currentPlayer = null;
        currentPlayerPath = null;
        if (currentPlayerElement) {
          const icon = currentPlayerElement.querySelector('.preview-icon');
          if (icon) icon.remove();
          currentPlayerElement = null;
        }
        return;
      }
      // Stop existing playback
      if (currentPlayer) {
        currentPlayer.pause();
        currentPlayer.currentTime = 0;
        if (currentPlayerElement) {
          const icon = currentPlayerElement.querySelector('.preview-icon');
          if (icon) icon.remove();
        }
      }
      // Start new playback
      const src = pathToFileURL(file.path).href;
      currentPlayer = new Audio(src);

      // Get current volume from slider
      const currentVolume = parseInt(
        document.getElementById('volume-slider').value,
        10
      ) / 100;
      currentPlayer.volume = currentVolume;

      currentPlayerPath = file.path;
      currentPlayerElement = el;
      // add icon indicator
      const iconEl = document.createElement('span');
      iconEl.textContent = '🔊 ';
      iconEl.className = 'preview-icon';
      el.prepend(iconEl);
      currentPlayer.play().catch(err => console.error('Preview failed:', err));
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

  // Read BPM range
  const [bpmMin, bpmMax] = document
    .getElementById('bpm-slider')
    .noUiSlider.get()
    .map(v => parseInt(v, 10));

  const bpmMode    = document.querySelector('input[name="bpm-mode"]:checked').value;
  const exactInput = parseInt(document.getElementById('bpmExact').value, 10);

  const energyThreshold = parseFloat(document.getElementById('energy-slider')?.value) || 0;
  const lengthMax = parseFloat(document.getElementById('max-length-slider').value) || Infinity;

  const output = document.getElementById('output');
  output.classList.toggle('hidden', allAnalyzedFiles.length === 0);

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
      if (isNaN(exactInput)) okBpm = true;
      else okBpm = file.bpm == null || Math.round(file.bpm) === exactInput;
    }

    const okEnergy = file.energy == null || file.energy >= energyThreshold;
    const okLength = dur           == null || dur <= lengthMax;

    return okName && okKey && okScale && okBpm && okEnergy && okLength;
  });

  renderFileList(filtered);
}

window.applyFilter = applyFilter;

document.addEventListener('DOMContentLoaded', () => {
  // ————— Your existing UI‑init code —————

  // Progress elements
  const progressBar   = document.getElementById('progress-bar');
  const progressText  = document.getElementById('progress-text');
  const processedList = document.getElementById('processed-list');

  // BPM slider
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

  // Toggle BPM mode
  const rangeControls = document.getElementById('bpm-range-controls');
  const exactControls = document.getElementById('bpm-exact-controls');
  document.querySelectorAll('input[name="bpm-mode"]').forEach(radio =>
    radio.addEventListener('change', () => {
      const isRange = radio.value === 'range';
      rangeControls.classList.toggle('hidden', !isRange);
      exactControls.classList.toggle('hidden',  isRange);
      applyFilter();
    })
  );
  document.getElementById('bpmExact').addEventListener('input', applyFilter);

  // Energy slider (guarded)
  const energySlider = document.getElementById('energy-slider');
  const energyLabel  = document.getElementById('energy-val');
  if (energySlider && energyLabel) {
    energySlider.addEventListener('input', e => {
      energyLabel.textContent = parseFloat(e.target.value).toFixed(2);
      applyFilter();
    });
  }

  // Length slider
  const lengthSlider = document.getElementById('max-length-slider');
  const lengthLabel  = document.getElementById('length-max-val');
  lengthSlider.addEventListener('input', e => {
    const num = parseFloat(e.target.value);
    lengthLabel.textContent = (num === parseFloat(lengthSlider.max)) ? '∞' : num.toFixed(1);
    applyFilter();
  });

  // Text filters
  ['search','key','scale'].forEach(id =>
    document.getElementById(id).addEventListener('input', applyFilter)
  );

  // Reset & clear DB
  document.getElementById('reset-filters').addEventListener('click', () => {
    document.getElementById('search').value = '';
    document.getElementById('key').value = '';
    document.getElementById('scale').value = '';
    bpmSlider.noUiSlider.set([0, 300]);
    document.getElementById('bpmExact').value = '';
    document.querySelector('input[name="bpm-mode"][value="range"]').checked = true;
    rangeControls.classList.remove('hidden');
    exactControls.classList.add('hidden');
    if (energySlider) energySlider.value = 0;
    if (energyLabel) energyLabel.textContent = '0.00';
    lengthSlider.value = lengthSlider.max;
    lengthLabel.textContent = '∞';
    loadAllTracks();
  });

  document.getElementById('clear-db').addEventListener('click', async () => {
    const res = await ipcRenderer.invoke('clear-database');
    if (res.error) {
      console.error('Error clearing database:', res.error);
      return;
    }
    loadAllTracks();
  });

  // Progress-update handler
  ipcRenderer.on('progress-update', (_, { percent, current }) => {
    if (percent === 0) {
      // show the progress panel
      document.getElementById('progress-container').classList.remove('hidden');
      processedList.innerHTML = '';
    }
    progressBar.value = percent;
    progressText.textContent = `Analyserar: ${current.split(/[/\\]/).pop()} (${percent}%)`;
    if (percent === 100) {
      setTimeout(() => {
        document.getElementById('progress-container').classList.add('hidden');
      }, 1500);
    }
  });

  // ————— Global drag‑and‑drop (full‑window) —————

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'drop-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '2rem',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.2s',
    zIndex: '9999'
  });
  overlay.textContent = '📂 Drop a folder anywhere to analyze…';
  document.body.appendChild(overlay);

  function showOverlay() {
    overlay.style.pointerEvents = 'auto';
    overlay.style.opacity = '1';
  }
  function hideOverlay() {
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0';
  }

  // Drag events (only for files)
  ['dragenter', 'dragover'].forEach(evt =>
    window.addEventListener(evt, e => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        showOverlay();
      }
    })
  );

  ['dragleave', 'drop'].forEach(evt =>
    window.addEventListener(evt, e => {
      e.preventDefault();
      hideOverlay();
    })
  );

  window.addEventListener('drop', async e => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items || [])
      .filter(item => item.kind === 'file');
    if (!items.length) return;

    // Extract folder paths
    const folders = items
      .map(item => item.webkitGetAsEntry?.())
      .filter(entry => entry?.isDirectory)
      .map((entry, i) => items[i].getAsFile().path);

    overlay.textContent = '🔄 Analyzing…';
    const result = await ipcRenderer.invoke(
      'drop-and-analyze-folders-with-progress',
      folders
    );
    await loadAllTracks();
    overlay.textContent = `✅ Analyzed ${result.analyzed.length} files`;
    setTimeout(hideOverlay, 1500);

    const exportRes = await ipcRenderer.invoke(
      'export-analyzed-to-json',
      result.analyzed
    );
    if (exportRes.error) console.error('Export error:', exportRes.error);
  });

  // Volume slider
  const volumeSlider = document.getElementById('volume-slider');
  const volumeLabel  = document.getElementById('volume-val');
  if (volumeSlider && volumeLabel) {
    volumeSlider.addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      volumeLabel.textContent = `${v}%`;
      if (currentPlayer) currentPlayer.volume = v / 100;
    });
  }

  // Initial load
  loadAllTracks();
});
