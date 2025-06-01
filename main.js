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
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Ljudfiler', extensions: ['mp3', 'wav'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { error: 'Ingen fil vald' };
    }

    const filePath = result.filePaths[0];
    const data = await analyzeAudio(filePath);
    return data;
  });
}

app.whenReady().then(createWindow);
