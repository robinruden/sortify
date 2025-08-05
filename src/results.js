const { ipcRenderer } = require('electron');

/**
 * Renders an array of file objects into the #output container.
 * @param {Array} files – each file should have .path, .duration, .bpm, .key, .scale
 */
function renderFileList(files) {
  const output = document.getElementById('output');
  if (!output) return;
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
}

/**
 * Initializes context‐menu preview and keyboard navigation in the results list.
 * @param {Object} player – instance of PreviewPlayer (with .toggle(path,el,vol) )
 * @param {HTMLInputElement} volumeSlider – the volume range input element
 */
function initResultsNavigation(player, volumeSlider) {
  const output = document.getElementById('output');
  if (!output) return;

  let selectedIndex = -1;
  function updateSelection(items) {
    items.forEach((el, idx) =>
      el.classList.toggle('selected', idx === selectedIndex)
    );
    if (selectedIndex >= 0) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

     // Left-click to start/stop preview
 output.addEventListener('click', e => {
    const item = e.target.closest('.file-item');
    if (!item) return;

      // 1) update selectedIndex
    const items = Array.from(output.querySelectorAll('.file-item'));
    selectedIndex = items.indexOf(item);
    updateSelection(items);
 
   const vol = parseInt(volumeSlider.value, 10) / 100;
  });
  
  // 1) Context‐menu / right‐click to toggle preview
  output.addEventListener('contextmenu', e => {
    const item = e.target.closest('.file-item');
    if (!item) return;

  

   

  e.preventDefault();
    const vol = volumeSlider
      ? parseInt(volumeSlider.value, 10) / 100
      : 1;
    player.toggle(item.dataset.path, item, vol);
  });

  


    




  document.addEventListener('keydown', e => {
    // ── allow typing spaces in any focused input/textarea ──
    const active = document.activeElement;
    if (active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      )) {
      return;
    }
    
     const items = Array.from(output.querySelectorAll('.file-item'));
    
    if (!items.length) return;

    const vol = parseInt(volumeSlider.value, 10) / 100;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // …update selectedIndex…
        player.toggle(items[selectedIndex].dataset.path,
                      items[selectedIndex],
                      vol);
        break;

      case 'ArrowUp':
        e.preventDefault();
        // …update selectedIndex…
        player.toggle(items[selectedIndex].dataset.path,
                      items[selectedIndex],
                      vol);
        break;

      case ' ':
      case 'Spacebar':
        e.preventDefault();
        if (selectedIndex >= 0) {
          player.toggle(items[selectedIndex].dataset.path,
                        items[selectedIndex],
                        vol);
        }
        break;
    }
  });
}



module.exports = {
  renderFileList,
  initResultsNavigation
};