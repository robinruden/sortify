// src/renderer.js
const { ipcRenderer } = require('electron');

let allAnalyzedFiles = [];

// Render a list of files
function renderFileList(files) {
  const output = document.getElementById('output');
  output.innerHTML = '';

  files.forEach(file => {
    const filename = file.path.split(/[/\\]/).pop();
    const el = document.createElement('div');
    el.className = 'file-item';
    el.textContent = `${filename} — BPM: ${file.bpm?.toFixed(1) ?? '–'}, ${file.key ?? '–'} ${file.scale ?? ''}, Energy: ${file.energy?.toFixed(2) ?? '–'}`;
    el.draggable = true;
    el.dataset.path = file.path;
    el.addEventListener('dragstart', e => {
      e.preventDefault();
      ipcRenderer.invoke('ondragstart', file.path);
    });
    output.appendChild(el);
  });
}

// Fetch all tracks from main and apply display logic
async function loadAllTracks() {
  allAnalyzedFiles = await ipcRenderer.invoke('get-all-tracks');
  applyFilter();
}

// Filter in-memory array, hide or show results
function applyFilter() {
  const searchRaw    = document.getElementById('search').value;
  const keyRaw       = document.getElementById('key').value;
  const scaleRaw     = document.getElementById('scale').value;
  const bpmMinRaw    = document.getElementById('bpmMin').value;
  const bpmMaxRaw    = document.getElementById('bpmMax').value;
  const energyMinRaw = document.getElementById('energyMin').value;
  const energyMaxRaw = document.getElementById('energyMax').value;

  const output = document.getElementById('output');

  const anyFilter = [searchRaw, keyRaw, scaleRaw, bpmMinRaw, bpmMaxRaw, energyMinRaw, energyMaxRaw]
    .some(val => val !== null && val !== '');

  if (!anyFilter) {
    if (allAnalyzedFiles.length === 0) {
      output.style.display = 'none';
      return;
    }
    output.style.display = 'block';
    renderFileList(allAnalyzedFiles);
    return;
  }

  output.style.display = 'block';
  const searchTerm = searchRaw.toLowerCase();
  const keyTerm    = keyRaw.toLowerCase();
  const scaleTerm  = scaleRaw.toLowerCase();
  const bpmMin     = parseFloat(bpmMinRaw)   || 0;
  const bpmMax     = parseFloat(bpmMaxRaw)   || Infinity;
  const energyMin  = parseFloat(energyMinRaw) || 0;
  const energyMax  = parseFloat(energyMaxRaw) || Infinity;

  const filtered = allAnalyzedFiles.filter(file => {
    const name = file.path.split(/[/\\]/).pop().toLowerCase();
    return (
      name.includes(searchTerm) &&
      (!keyTerm   || file.key?.toLowerCase()   === keyTerm) &&
      (!scaleTerm || file.scale?.toLowerCase() === scaleTerm) &&
      (file.bpm   == null || (file.bpm   >= bpmMin   && file.bpm   <= bpmMax)) &&
      (file.energy== null || (file.energy>= energyMin && file.energy<= energyMax))
    );
  });

  renderFileList(filtered);
}

window.applyFilter = applyFilter;

// Set up on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const output          = document.getElementById('output');
  const progressBar     = document.getElementById('progress-bar');
  const progressText    = document.getElementById('progress-text');
  const processedList   = document.getElementById('processed-list');

  // Initially hide output until data arrives
  output.style.display = 'none';

  // Live filter inputs
  ['search','key','scale','bpmMin','bpmMax','energyMin','energyMax']
    .map(id => document.getElementById(id))
    .forEach(el => el.addEventListener('input', applyFilter));

  // Listen for progress updates during analysis
  ipcRenderer.on('progress-update', (_, { percent, current }) => {
    // Update bar + text
    progressBar.value = percent;
    const fileName = current.split(/[/\\]/).pop();
    progressText.textContent = `Analyserar: ${fileName} (${percent}%)`;

    // Clear list on first update
    if (percent === 0) processedList.innerHTML = '';

    // Append current file to list
    const li = document.createElement('li');
    li.textContent = fileName;
    processedList.appendChild(li);
  });

  // Drag-and-drop handling for folders
  const dropArea         = document.getElementById('drop-area');
  const progressContainer= document.getElementById('progress-container');

  dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.style.borderColor = '#007bff'; });
  dropArea.addEventListener('dragleave', () => { dropArea.style.borderColor = '#ccc'; });

  dropArea.addEventListener('drop', async e => {
    e.preventDefault();
    dropArea.style.borderColor = '#ccc';

    const folderPaths = [];
    for (const item of e.dataTransfer.items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const file = item.getAsFile();
        if (file?.path) folderPaths.push(file.path);
      }
    }
    if (!folderPaths.length) return;

    // Show progress UI and clear processed list
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressText.textContent = 'Analyserar…';
    processedList.innerHTML = '';

    // Run analysis
    const result = await ipcRenderer.invoke('drop-and-analyze-folders-with-progress', folderPaths);

    // Reload full list
    await loadAllTracks();

    // Finalize progress UI
    progressBar.value = 100;
    progressText.textContent = `✅ Klar! Analyserade ${result.analyzed.length} filer`;
    setTimeout(() => progressContainer.style.display = 'none', 1500);

    // Optionally export JSON
    const exportRes = await ipcRenderer.invoke('export-analyzed-to-json', result.analyzed);
    if (exportRes.error) console.error('Export error:', exportRes.error);
  });

  // Initial data load
  loadAllTracks();
});
