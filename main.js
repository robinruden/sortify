require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`)
});

const { globalShortcut, app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const analyzeAudio = require('./src/analyzeAudio.js');

// Move the window reference into module scope
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');
}

// recursive directory walker
async function walkDir(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

app.whenReady().then(() => {
  createWindow();

  // Register Cmd/Ctrl+R to pop up (or restore) & focus the window
  globalShortcut.register('CommandOrControl+R', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

/*   ipcMain.handle('select-and-analyze', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {  
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
  }) */
   ipcMain.handle('select-and-index-folders', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'multiSelections']
    });
    if (result.canceled) {
      return { error: 'Ingen mapp vald' };
    }
    const allFiles = [];
    for (const folder of result.filePaths) {
      allFiles.push(...await walkDir(folder));
    }
    return { files: allFiles };
  });
});