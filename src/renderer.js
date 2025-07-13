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
          // remove icon
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
      currentPlayer.volume = 0.8;
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

  const energyThreshold = parseFloat(document.getElementById('energy-slider').value) || 0;
  const lengthMax = parseFloat(document.getElementById('max-length-slider').value) || Infinity;

  const output = document.getElementById('output');
 /*  output.style.display = allAnalyzedFiles.length > 0 ? 'block' : 'none'; */
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
  const progressBar   = document.getElementById('progress-bar');
  const progressText  = document.getElementById('progress-text');
  const processedList = document.getElementById('processed-list');
  const dropArea = document.getElementById('drop-area');
  const progressContainer = document.getElementById('progress-container');

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

  const rangeControls = document.getElementById('bpm-range-controls');
  const exactControls = document.getElementById('bpm-exact-controls');

  // Toggle range vs exact BPM
  document.querySelectorAll('input[name="bpm-mode"]').forEach(radio =>
    radio.addEventListener('change', () => {
      const isRange = radio.value === 'range';
      // flip the CSS class instead of style.display
    rangeControls.classList.toggle('hidden', !isRange);
    exactControls.classList.toggle('hidden',  isRange);
    applyFilter();
    })
  );
  document.getElementById('bpmExact').addEventListener('input', applyFilter);

  // Energy slider setup
  const energySlider = document.getElementById('energy-slider');
  const energyLabel  = document.getElementById('energy-val');
  energySlider.addEventListener('input', e => {
    energyLabel.textContent = parseFloat(e.target.value).toFixed(2);
    applyFilter();
  });

  // Length slider setup
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

  // Reset filters button
  const resetBtn = document.getElementById('reset-filters');
  resetBtn.addEventListener('click', () => {
    // Clear text inputs
    document.getElementById('search').value = '';
    document.getElementById('key').value = '';
    document.getElementById('scale').value = '';
    // Reset BPM controls
    bpmSlider.noUiSlider.set([0, 300]);
    document.getElementById('bpmExact').value = '';
    document.querySelector('input[name="bpm-mode"][value="range"]').checked = true;
    rangeControls.classList.remove('hidden');
    exactControls.classList.add('hidden');
    // Reset energy slider
    energySlider.value = 0;
    energyLabel.textContent = '0.00';
    // Reset length slider
    lengthSlider.value = lengthSlider.max;
    lengthLabel.textContent = '∞';
    console.log('Filters reset');
    loadAllTracks();
  });

  // Clear database button
  const clearDbBtn = document.getElementById('clear-db');
  clearDbBtn.addEventListener('click', async () => {
    const res = await ipcRenderer.invoke('clear-database');
    if (res.error) {
      console.error('Error clearing database:', res.error);
      return;
    }
    console.log('Database cleared');
    // Reload full list
    await loadAllTracks();
  });

  // Progress updates
 ipcRenderer.on('progress-update', (_, { percent, current }) => {
    // when we start (0%), show the panel and clear the list
    if (percent === 0) {
      progressContainer.classList.remove('hidden');
      processedList.innerHTML = '';
    }

    progressBar.value = percent;
    const name = current.split(/[/\\]/).pop();
    progressText.textContent = `Analyserar: ${name} (${percent}%)`;

    // when done (100%), hide it after a short delay
    if (percent === 100) {
      setTimeout(() => {
        progressContainer.classList.add('hidden');
      }, 1500);
    }
  });

  // Drag-and-drop styling
  dropArea.addEventListener('dragover', e => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
  });

  // Handle the drop
  dropArea.addEventListener('drop', async e => {
    e.preventDefault();
    dropArea.classList.remove('dragover');

    // show progress panel
    processedList.innerHTML = '';
    progressContainer.classList.remove('hidden');
    progressBar.value = 0;
    progressText.textContent = 'Analyserar…';

    // do your folder analysis…
    const items = Array.from(e.dataTransfer.items);
    const folders = items
      .map(item => item.webkitGetAsEntry?.())
      .filter(entry => entry?.isDirectory)
      .map((entry, idx) => items[idx].getAsFile().path);

    const result = await ipcRenderer.invoke('drop-and-analyze-folders-with-progress', folders);
    await loadAllTracks();

    progressBar.value = 100;
    progressText.textContent = `✅ Klar! Analyserade ${result.analyzed.length} filer`;

    // hide panel again
    setTimeout(() => {
      progressContainer.classList.add('hidden');
    }, 1500);

    const exportRes = await ipcRenderer.invoke('export-analyzed-to-json', result.analyzed);
    if (exportRes.error) console.error('Export error:', exportRes.error);
  });

  // Initial load
  loadAllTracks();
});
