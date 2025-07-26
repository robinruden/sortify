// src/renderer.js
const { ipcRenderer } = require('electron');
const PreviewPlayer   = require('./src/previewPlayer.js');
const { getFilters, matches } = require('./src/filters.js');
const { initHamburger } = require('./src/hamburger.js');
const { renderFileList, initResultsNavigation } = require ('./src/results.js');
const { mapLength } = require('./src/utils/lengthMapper.js'); // Assuming you have a lengthMapper.js for length mapping

let allAnalyzedFiles = [];
const player = new PreviewPlayer();

// Render a list of files
/* function renderFileList(files) {
  const output = document.getElementById('output');
  output.innerHTML = '';

  files.forEach(file => {
    const filename = file.path.split(/[/\\]/).pop();
    const durText  = file.duration != null
      ? `${file.duration.toFixed(1)} s`
      : '–';

    const el = document.createElement('div');
    el.className    = 'file-item';
    el.dataset.path = file.path;
    el.textContent  =
      `${filename} — Längd: ${durText}, BPM: ${file.bpm?.toFixed(1) ?? '–'}, ` +
      `${file.key ?? '–'} ${file.scale ?? ''}`;
    el.draggable = true;

    // Drag to reveal in Finder/Explorer
    el.addEventListener('dragstart', e => {
      e.preventDefault();
      ipcRenderer.invoke('ondragstart', file.path);
    });

    output.appendChild(el);
  });
} */

// Load from DB and then filter
async function loadAllTracks() {
  allAnalyzedFiles = await ipcRenderer.invoke('get-all-tracks');
  applyFilter();
}

// Read UI, filter files, re-render
function applyFilter() {
  const filters  = getFilters({
    search:       document.getElementById('search'),
    key:          document.getElementById('key'),
    scale:        document.getElementById('scale'),
    bpmSlider:    document.getElementById('bpm-slider'),
    bpmExact:     document.getElementById('bpmExact'),
    lengthSlider: document.getElementById('max-length-slider'),
  }); 
  const filtered = allAnalyzedFiles.filter(f => matches(f, filters));
  renderFileList(filtered, player);
}

window.applyFilter = applyFilter;

// Toggle hamburger menu on click
document.addEventListener('DOMContentLoaded', () => {
  initHamburger({ toggleId: 'hamburger-toggle', menuId: 'myLinks' });
  initResultsNavigation(player);
  // Other initialization code can go here
  // For example, setting up event listeners, loading initial data, etc.
  
  // Load all tracks initially
  
})

document.addEventListener('DOMContentLoaded', () => {
  const output        = document.getElementById('output');
  const bpmSlider     = document.getElementById('bpm-slider');
  const bpmMinLabel   = document.getElementById('bpm-min-val');
  const bpmMaxLabel   = document.getElementById('bpm-max-val');
  const bpmExact      = document.getElementById('bpmExact');
  const lengthSlider  = document.getElementById('max-length-slider');
  const lengthLabel   = document.getElementById('length-max-val');
  const resetFilters  = document.getElementById('reset-filters');
  const clearDb       = document.getElementById('clear-db');
  const progressCnt   = document.getElementById('progress-container');
  const progressBar   = document.getElementById('progress-bar');
  const progressText  = document.getElementById('progress-text');
  const processedList = document.getElementById('processed-list');
  const volumeSlider  = document.getElementById('volume-slider');
  const volumeLabel   = document.getElementById('volume-val');
 
  // 1) Slider & filter UI hookups
  noUiSlider.create(bpmSlider, {
    start: [0,300], connect: true,
    range: { min:0, max:300 }, step:1,
    tooltips: [true,true],
    format: { to:v=>parseInt(v,10), from:v=>parseInt(v,10) }
  });
  bpmSlider.noUiSlider.on('update', ([min,max]) => {
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
  bpmExact.addEventListener('input', applyFilter);

  lengthSlider.addEventListener('input', e => {
  const raw         = +e.target.value;
  const max         = +lengthSlider.max;            
  const actual      = mapLength(raw, max, 12); // Use the mapLength function to apply the curve

  console.log({ raw, actual }); 
            
  lengthLabel.textContent = raw === max ? '∞' : actual.toFixed(2);
  
  applyFilter();
});
  ['search','key','scale'].forEach(id =>
    document.getElementById(id).addEventListener('input', applyFilter)
  );
  resetFilters.addEventListener('click', () => {
    document.getElementById('search').value = '';
    document.getElementById('key').value    = '';
    document.getElementById('scale').value  = '';
    bpmSlider.noUiSlider.set([0,300]);
    bpmExact.value = '';
    document.querySelector('input[name="bpm-mode"][value="range"]').checked = true;
    document.getElementById('bpm-range-controls').classList.remove('hidden');
    document.getElementById('bpm-exact-controls').classList.add('hidden');
    lengthSlider.value = lengthSlider.max; 
    lengthLabel.textContent = '∞';
    loadAllTracks();
  });
  clearDb.addEventListener('click', async () => {
    const res = await ipcRenderer.invoke('clear-database');
    if (!res.error) loadAllTracks();
  });

  // 2) Delegate preview toggle
  output.addEventListener('contextmenu', e => {
    const item = e.target.closest('.file-item');
    if (!item) return;
    e.preventDefault();
    const vol = parseInt(volumeSlider.value,10) / 100;
    player.toggle(item.dataset.path, item, vol);
  });

  // Volume toggle at bottom: show/hide fader
  const volumeToggle = document.getElementById('volume-toggle');
  const volumeContainer = document.getElementById('volume-container');
  volumeToggle.addEventListener('click', () => {
    volumeContainer.classList.toggle('hidden');
  });

  // 3) Overlay spinner & progress
  const overlay = document.createElement('div');
  overlay.id = 'drop-overlay';
  Object.assign(overlay.style, {
    position:'fixed', top:0,left:0,right:0,bottom:0,
    background:'rgba(0,0,0,0.5)',
    display:'flex',alignItems:'center',justifyContent:'center',
    color:'#fff',fontSize:'1.5rem',pointerEvents:'none',
    opacity:'0',transition:'opacity 0.2s',zIndex:'9999'
  });
  document.body.appendChild(overlay);
  function showSpinnerOverlay(pct=0) {
    overlay.innerHTML = `<span class="spinner"></span>
                         <span>Analyzing…</span>
                         <span class="percent">${pct}%</span>`;
    overlay.style.pointerEvents = 'auto';
    overlay.style.opacity = '1';
  }
  function showDoneOverlay(n) {
    overlay.innerHTML = `✅ Analyzed ${n} files`;
    overlay.style.opacity = '1';
    setTimeout(() => overlay.style.opacity = '0', 1500);
  }
  function hideOverlay() {
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0';
  }
  ['dragenter','dragover'].forEach(evt =>
    window.addEventListener(evt, e => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        showSpinnerOverlay(0);
      }
    })
  );
  window.addEventListener('dragleave', e => { e.preventDefault(); hideOverlay(); });
  window.addEventListener('drop', e => {
  e.preventDefault();

  // Immediately show the spinner (and let it paint)
  showSpinnerOverlay(0);

  // Collect folder paths
  const items = Array.from(e.dataTransfer.items || [])
    .filter(i => i.kind === 'file');
  if (!items.length) {
    hideOverlay();
    return;
  }
  const folders = items
    .map(i => i.webkitGetAsEntry?.())
    .filter(en => en?.isDirectory)
    .map((en, i) => items[i].getAsFile().path);

  // Defer the heavy lifting until after the browser repaints
  setTimeout(async () => {
    try {
      const { analyzed } = await ipcRenderer.invoke(
        'drop-and-analyze-folders-with-progress',
        folders
      );
      await loadAllTracks();           // re‑render your list
      showDoneOverlay(analyzed.length); // ✅ finish
    } catch (err) {
      console.error('Analysis failed', err);
      hideOverlay();
    }
  }, 0);
});

  ipcRenderer.on('progress-update', (_, { percent, current }) => {
    // update native progress bar/list
    if (percent === 0) {
      progressCnt.classList.remove('hidden');
      processedList.innerHTML = '';
    }
    progressBar.value = percent;
    progressText.textContent = `Analyserar: ${current.split(/[/\\\\]/).pop()} (${percent}%)`;
    if (percent > 0 && percent < 100) {
      const li = document.createElement('li');
      li.textContent = current.split(/[/\\\\]/).pop();
      processedList.appendChild(li);
    }
    if (percent === 100) setTimeout(() => progressCnt.classList.add('hidden'), 1500);

    // also update overlay %
    if (overlay.style.opacity === '1' && percent < 100) {
      showSpinnerOverlay(percent);
    }
  });

  // Volume slider
  volumeSlider.addEventListener('input', e => {
    const v = parseInt(e.target.value, 10);
    volumeLabel.textContent = `${v}%`;
    player.setVolume(v / 100);
  });

  // Initial load
  loadAllTracks();


});
