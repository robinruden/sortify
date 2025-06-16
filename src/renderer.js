// src/renderer.js
const { ipcRenderer } = require('electron');

let allAnalyzedFiles = [];

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
    el.addEventListener('dragstart', e => {
      e.preventDefault();
      ipcRenderer.invoke('ondragstart', file.path);
    });
    output.appendChild(el);
  });
}

// Fetch all tracks and apply display logic
async function loadAllTracks() {
  allAnalyzedFiles = await ipcRenderer.invoke('get-all-tracks');
  applyFilter();
}

// Filter in-memory array, hide or show results
function applyFilter() {
  // Read text/number filters
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const keyTerm    = document.getElementById('key').value.toLowerCase();
  const scaleTerm  = document.getElementById('scale').value.toLowerCase();
  const bpmMin     = parseFloat(document.getElementById('bpmMin').value)   || 0;
  const bpmMax     = parseFloat(document.getElementById('bpmMax').value)   || Infinity;
  const energyMin  = parseFloat(document.getElementById('energyMin').value) || 0;
  const energyMax  = parseFloat(document.getElementById('energyMax').value) || Infinity;

  // Read max length from single slider
  const maxSlider  = document.getElementById('max-length-slider');
  const lengthMax  = parseFloat(maxSlider.value) || Infinity;

  const output = document.getElementById('output');

  // Determine if any filter is active (including length slider not at max)
  const anyFilter =
    searchTerm || keyTerm || scaleTerm ||
    document.getElementById('bpmMin').value || document.getElementById('bpmMax').value ||
    document.getElementById('energyMin').value || document.getElementById('energyMax').value ||
    (lengthMax !== parseFloat(maxSlider.max));

  if (!anyFilter && allAnalyzedFiles.length === 0) {
    output.style.display = 'none';
    return;
  }

  output.style.display = 'block';

  const filtered = allAnalyzedFiles.filter(file => {
    const name = file.path.split(/[/\\]/).pop().toLowerCase();
    const dur  = file.duration;

    const okName   = !searchTerm || name.includes(searchTerm);
    const okKey    = !keyTerm   || (file.key?.toLowerCase()   === keyTerm);
    const okScale  = !scaleTerm || (file.scale?.toLowerCase() === scaleTerm);
    const okBpm    = file.bpm   == null || (file.bpm   >= bpmMin   && file.bpm   <= bpmMax);
    const okEnergy = file.energy== null || (file.energy>= energyMin&& file.energy<= energyMax);
    const okLength = dur        == null || (dur        <= lengthMax);

    return okName && okKey && okScale && okBpm && okEnergy && okLength;
  });

  renderFileList(filtered);
}

window.applyFilter = applyFilter;

// Set up UI and events on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const output          = document.getElementById('output');
  const progressBar     = document.getElementById('progress-bar');
  const progressText    = document.getElementById('progress-text');
  const processedList   = document.getElementById('processed-list');

  // Single max-length slider setup
  const maxSlider = document.getElementById('max-length-slider');
  const maxLabel  = document.getElementById('length-max-val');

  function updateMaxLabel(val) {
    const num = parseFloat(val);
    maxLabel.textContent = (num === parseFloat(maxSlider.max))
      ? '∞'
      : num.toFixed(1);
  }

  maxSlider.addEventListener('input', e => {
    updateMaxLabel(e.target.value);
    applyFilter();
  });
  updateMaxLabel(maxSlider.value);

  // Wire up text/number inputs for live filtering
  ['search','key','scale','bpmMin','bpmMax','energyMin','energyMax']
    .map(id => document.getElementById(id))
    .forEach(el => el.addEventListener('input', applyFilter));

  // Progress update for analysis
  ipcRenderer.on('progress-update', (_, { percent, current }) => {
    progressBar.value = percent;
    const fileName = current.split(/[/\\]/).pop();
    progressText.textContent = `Analyserar: ${fileName} (${percent}%)`;
    if (percent === 0) processedList.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = fileName;
    processedList.appendChild(li);
  });

  // Drag-and-drop for indexing
  const dropArea         = document.getElementById('drop-area');
  const progressContainer= document.getElementById('progress-container');

  dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.style.borderColor = '#007bff'; });
  dropArea.addEventListener('dragleave', () => { dropArea.style.borderColor = '#ccc'; });

  dropArea.addEventListener('drop', async e => {
    e.preventDefault();
    dropArea.style.borderColor = '#ccc';
    processedList.innerHTML = '';
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressText.textContent = 'Analyserar…';

    const folderPaths = Array.from(e.dataTransfer.items)
      .map(item => item.webkitGetAsEntry?.())
      .filter(entry => entry?.isDirectory)
      .map(entry => entry && entry.isDirectory && item.getAsFile().path);

    const result = await ipcRenderer.invoke('drop-and-analyze-folders-with-progress', folderPaths);

    await loadAllTracks();

    progressBar.value = 100;
    progressText.textContent = `✅ Klar! Analyserade ${result.analyzed.length} filer`;
    setTimeout(() => progressContainer.style.display = 'none', 1500);

    const exportRes = await ipcRenderer.invoke('export-analyzed-to-json', result.analyzed);
    if (exportRes.error) console.error('Export error:', exportRes.error);
  });

  // Initial load
  loadAllTracks();
});