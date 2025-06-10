/* console.log('🏗️ Renderer loaded'); */

const { ipcRenderer } = require('electron');

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