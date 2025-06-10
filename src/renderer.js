console.log('🏗️ Renderer loaded');

const { ipcRenderer } = require('electron');

window.pickAndAnalyze = async () => {
  const output = document.getElementById('output');
  output.textContent = 'Väljer fil…';

  try {
    const data = await ipcRenderer.invoke('select-and-analyze');
    console.log('🔥 data from main:', data);
    
    if (data.error) {
      output.textContent = `Fel: ${data.error}`;
      return;
    }

    const lines = [];
    lines.push(`Format:         ${data.format}`);
    lines.push(`Längd:          ${data.duration.toFixed(2)} s`);
    lines.push(`Samplingsfrekvens: ${data.sampleRate} Hz`);
    lines.push(`Bitrate:        ${(data.bitrate / 1000).toFixed(0)} kbps`);
    lines.push(`BPM (tempo):    ${typeof data.bpm === 'number' ? data.bpm.toFixed(2) : 'Ej detekterat'}`);
    console.log('🔥 data.bpm is:', data.bpm);

  // Om keyIndex finns:
  if (data.key && typeof data.key.noteName === 'string') {
    console.log('🔥 data.key.noteName is:', data.key.noteName);
      const noteName = data.key.noteName;
      const scale    = data.key.scale || '';
      lines.push(`Tonart:         ${noteName} ${scale}`);
    } else {
      lines.push('Tonart:         Ej detekterat');
    }

    output.textContent = lines.join('\n');
  } catch (err) {
    console.error(err);
    output.textContent = `Ett oväntat fel inträffade: ${err.message}`;
  }
};