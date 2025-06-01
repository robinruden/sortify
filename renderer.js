const { ipcRenderer } = require('electron');

async function pickAndAnalyze() {
  const result = await ipcRenderer.invoke('select-and-analyze');
  document.getElementById('output').textContent = JSON.stringify(result, null, 2);
}
