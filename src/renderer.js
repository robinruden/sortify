//renderer.js

const { ipcRenderer } = require('electron');

async function pickAndIndex() {
  const res = await ipcRenderer.invoke('select-and-index-folders');
  if (res.error) {
    console.error(res.error);
    return;
  }
  // res.files is an array of full file paths
  console.log('Indexed files:', res.files);
  // e.g. render into your UI:
  document.getElementById('output').textContent = res.files.join('\n');
}

window.pickAndIndex = pickAndIndex;


window.pickAndAnalyze = async () => {
  const output = document.getElementById('output');
  output.textContent = 'Väljer fil…';

  try {
    const data = await ipcRenderer.invoke('select-and-analyze');
    /* console.log('🔥 data from main:', data); */
    textContent = JSON.stringify(data, null, 2);
    if (data.error) {
      output.textContent = `Fel: ${data.error}`;
      return;
    }

    const lines = [];
    lines.push(`Format:         ${data.format}`);
    lines.push(`Längd:          ${data.duration.toFixed(2)} s`);
    lines.push(`Samplingsfrekvens:  ${data.sampleRate} Hz`);
   
    const bpm = data.features?.bpm || data.bpm;
    lines.push(`BPM:           ${bpm ? bpm.toFixed(2) : 'Ej detekterat'}`);
    
    const key = data.features?.key || 'Ej detekterat';
    const scale = data.features?.scale || '';
    lines.push(`Tonart:             ${key} ${scale}`.trim());

    const energy = data.features?.energy;
    lines.push(`Energi:             ${typeof energy === 'number' ? energy.toFixed(2) : 'Ej detekterat'}`);

    output.textContent = lines.join('\n');
  } catch (err) {
    console.error(err);
    output.textContent = `Ett oväntat fel inträffade: ${err.message}`;
  }
};

window.filterByBPM = async (min, max) => {
  try {
    const res = await ipcRenderer.invoke('filter-by-bpm', min, max);
    const output = document.getElementById('output');

    if (res.length === 0) {
      output.textContent = `Inga spår hittades mellan ${min} och ${max} BPM.`;
      return;
    }

    output.textContent = res.map(track =>
      `${track.path} — ${track.bpm.toFixed(2)} BPM`
    ).join('\n');
  } catch (err) {
    console.error('Filter error:', err);
    document.getElementById('output').textContent = `Fel vid filtrering: ${err.message}`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('drop-area');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropArea.style.borderColor = '#007bff';
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.style.borderColor = '#ccc';
  });

  dropArea.addEventListener('drop', async (event) => {
    event.preventDefault();
    dropArea.style.borderColor = '#ccc';

    const items = event.dataTransfer.items;
    const folderPaths = [];

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const file = item.getAsFile();
        if (file?.path) {
          folderPaths.push(file.path);
        }
      }
    }

    if (folderPaths.length === 0) {
      document.getElementById('output').textContent = 'Ingen mapp hittades.';
      return;
    }

    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressText.textContent = 'Analyserar…';

    const result = await ipcRenderer.invoke('drop-and-analyze-folders-with-progress', folderPaths);

    progressBar.value = 100;
    progressText.textContent = `✅ Klar! Analyserade ${result.analyzed.length} filer`;

    document.getElementById('output').textContent = result.analyzed.map(p => {
      const name = p.split(/[/\\]/).pop(); // både Mac och Windows
      return `🎧 ${name}`;
    }).join('\n');

    // Export to JSON
    const exportRes = await ipcRenderer.invoke('export-analyzed-to-json', result.analyzed);
    if (exportRes.error) {
      console.error('Export error:', exportRes.error);
    } else {
      console.log('Exported to:', exportRes.path);
    }
  });
});

ipcRenderer.on('progress-update', (_, data) => {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  progressBar.value = data.percent;
  const fileName = data.current.split(/[/\\]/).pop(); // Kompatibel för Mac & Windows
  progressText.textContent = `Analyserar: ${fileName} (${data.percent}%)`;
});

