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