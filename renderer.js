// renderer.js

const { ipcRenderer } = require('electron');

// Om du vill översätta nyckel‐index (0–11) till en not‐sträng:
const NOTE_NAMES = [
  'C',
  'C♯/D♭',
  'D',
  'D♯/E♭',
  'E',
  'F',
  'F♯/G♭',
  'G',
  'G♯/A♭',
  'A',
  'A♯/B♭',
  'B'
];

window.pickAndAnalyze = async () => {
  const output = document.getElementById('output');
  output.textContent = 'Väljer fil…';
  try {
    const data = await ipcRenderer.invoke('select-and-analyze');
    if (data.error) {
      output.textContent = `Fel: ${data.error}`;
      return;
    }


      const lines = [];
      lines.push(`Format:         ${data.format}`);
      lines.push(`Längd:          ${data.duration.toFixed(2)} s`);
      lines.push(`Samplingsfrekvens: ${data.sampleRate} Hz`);
      lines.push(`Bitrate:        ${(data.bitrate / 1000).toFixed(0)} kbps`);
      lines.push(`BPM (tempo):    ${data.bpm.toFixed(2)}`);
      // Om keyIndex finns:
      if (data.key && typeof data.key.keyIndex === 'number') {
        const idx = data.key.keyIndex;
        const scale = data.key.scale || '';
        const noteName = NOTE_NAMES[idx] || `(${idx})`;
        lines.push(`Tonart:         ${noteName} ${scale}`);
      }

      output.textContent = lines.join('\n');
    } catch (err) {
      console.error(err);
      output.textContent = `Ett oväntat fel inträffade: ${err.message}`;
    }
  }
