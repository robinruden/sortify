// src/renderer.js
const { ipcRenderer} = require('electron');
const PreviewPlayer   = require('./previewPlayer.js');
const { getFilters, matches } = require('./filters.js');
const { initHamburger } = require('./hamburger.js');
const { renderFileList, initResultsNavigation } = require ('./results.js');
const { mapLength } = require('./utils/lengthMapper.js');
const { MusicKeySelector } = require('./keySelector.js');

let allAnalyzedFiles = [];
const player = new PreviewPlayer();
/* const keySelector = new MusicKeySelector(); */

// Load from DB and then filter
async function loadAllTracks() {
  allAnalyzedFiles = await ipcRenderer.invoke('get-all-tracks');
  applyFilter();
}

// Read UI, filter files, re-render
function applyFilter() {
  const filters  = getFilters({
    search:       document.getElementById('search'),
    /* key:          document.getElementById('key'), */
    /* scale:        document.getElementById('scale'), */
    bpmSlider:    document.getElementById('bpm-slider'),
    bpmExact:     document.getElementById('bpmExact'),
    lengthSlider: document.getElementById('max-length-slider'),
  }); 
  const filtered = allAnalyzedFiles.filter(f => matches(f, filters));
  renderFileList(filtered, player);
}

window.applyFilter = applyFilter;
// Toggle hamburger menu on clickeydown

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
  const volumeVal     = document.getElementById('volume-val')
  const resultsFrame      = document.getElementById('results-frame');
  const startupPlaceholder= document.getElementById('startup-placeholder');
  const volumeToggle = document.getElementById('volume-toggle');
  const volumeContainer = document.getElementById('volume-container');


  
  // Volume slider: set initial value
  function showPlaceholder() {
    resultsFrame.classList.add('hidden');
    startupPlaceholder.classList.remove('hidden');
  }
  function showResults() {
    startupPlaceholder.classList.add('hidden');
    resultsFrame.classList.remove('hidden');
  }

  // Volume slider
  volumeSlider.addEventListener('input', e => {
    const v = parseInt(volumeSlider.value, 10) / 100;
    volumeVal.textContent = volumeSlider.value + '%';
    player.setVolume(v);
    
  });

  //Prevent all key input on the volume slider
  volumeSlider.addEventListener('keydown', (event) => {
    event.preventDefault(); // Prevent all key input (arrows, space, etc.)
  });


  initHamburger({ toggleId: 'hamburger-toggle', menuId: 'myLinks' });
  initResultsNavigation(player, volumeSlider);
  new MusicKeySelector(applyFilter);

   // on first run (no flag in localStorage) show the placeholder
  if (!localStorage.getItem('hasRunBefore')) {
    showPlaceholder();
  } else {
    showResults();
    loadAllTracks();
  }


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

  /* console.log({ raw, actual });  */
            
  lengthLabel.textContent = raw === max ? '∞' : actual.toFixed(2);
  
  applyFilter();
});
  /* ['search'].forEach(id =>
    document.getElementById(id).addEventListener('input', applyFilter)
  ); */
  document.getElementById('search')
    .addEventListener('input', applyFilter);
  
  resetFilters.addEventListener('click', () => {
    /* document.getElementById('search').value = ''; */
    /* document.getElementById('scale').value  = ''; */

document.querySelectorAll('.note-button.selected')
   .forEach(btn => btn.classList.remove('selected'));
 document.querySelectorAll('.mode-button.selected')
   .forEach(btn => btn.classList.remove('selected'));
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
   if (!res.error) {
    // remove the “ran before” flag so that
    // on next reload you’ll see the placeholder
    localStorage.removeItem('hasRunBefore');
    // and swap to the “please drag files” UI
    showPlaceholder();
  }
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
  

    // hook into the drop handler you already have:
  /*   window.addEventListener('drop', e => {
    e.preventDefault();

    // mark that we've now run once
    localStorage.setItem('hasRunBefore', 'true');
    showResults();

    // then continue your existing logic…
    showSpinnerOverlay(0);
    const folderPaths = Array.from(e.dataTransfer.files)
                             .map(f => f.path);
    ipcRenderer.invoke('drop-and-analyze-folders-with-progress', folderPaths)
      .then(({ analyzed }) => {
        loadAllTracks();
        showDoneOverlay(analyzed.length);
      });
  }); */
});






