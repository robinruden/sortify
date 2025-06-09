require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`)
});

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

const { analyzeAudio } = require('./analyzeAudio');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  ipcMain.handle('select-and-analyze', async () => {
    try {
      const result = await dialog.showOpenDialog(win, {  
        properties: ['openFile'],
        filters: [{ name: 'Ljudfiler', extensions: ['mp3', 'wav'] }]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { error: 'Ingen fil vald' };
      }

      const filePath = result.filePaths[0];
      console.log(`Vald fil: ${filePath}`);
      const data = await analyzeAudio(filePath);
      return data;
    } catch (error) {
      console.error('Fel vid analys av ljudfil:', error);
      return { error: 'Kunde inte analysera ljudfilen' };
    }
  })
}

app.whenReady().then(createWindow);