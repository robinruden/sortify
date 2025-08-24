// main.js
const path = require('path');
const fs   = require('fs');
const os   = require('os');
const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  shell,
  dialog
} = require('electron');

if (process.platform === 'darwin') {
  app.dock.setIcon(path.join(__dirname,'assets','img','sortify-icon-1.png'));
}
// Only reload in dev
if (!app.isPackaged) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', 'electron')
  });
}

const analyzeAudio        = require('./src/analyzeAudio.js');
const { saveTrack, isAlreadyIndexed } = require('./src/db/insert.js');
const { getTracksByBPM, getAllTracks } = require('./src/db/query.js');
const { searchTracks }    = require('./src/db/search.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 820,
    icon: path.join(__dirname, 'assets', 'img', 'sortify-icon-1.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Open DevTools so you can see any errors in packaged mode
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Load your UI
  mainWindow.loadFile(path.join(__dirname, 'index.html'))
    .then(() => console.log('✅ index.html loaded'))
    .catch(err => {
      console.error('❌ Failed to load index.html:', err);
      dialog.showErrorBox('Load Error', err.message);
    });
}

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
  console.log('App is packaged?', app.isPackaged);
  createWindow();

  globalShortcut.register('CommandOrControl+R', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  // IPC handlers
  ipcMain.handle('ondragstart', (_, filePath) => {
    const iconPath = path.join(__dirname, 'assets', 'cd_audio_cd-1.png');
    mainWindow.webContents.startDrag({ file: filePath, icon: iconPath });
  });

  ipcMain.on('drag-start', (_, filePath) => shell.showItemInFolder(filePath));
  ipcMain.handle('get-all-tracks',    () => getAllTracks());
  ipcMain.handle('search-tracks', (_, f) => searchTracks(f));

  ipcMain.handle('drop-and-analyze-folders-with-progress', async (_, folderPaths) => {
    const analyzed = [];
    for (const folder of folderPaths) {
      const files = await walkDir(folder);
      const audioFiles = files.filter(f => /\.(mp3|wav)$/i.test(f));
      let done = 0, total = audioFiles.length;
      for (const file of audioFiles) {
        if (!isAlreadyIndexed(file)) {
          try {
            const a = await analyzeAudio(file);
            const entry = {
              path: file,
              format: a.format,
              duration: a.duration,
              sampleRate: a.sampleRate,
              bpm: a.features?.bpm ?? null,
              key: a.features?.key ?? null,
              scale: a.features?.scale ?? null,
              energy: a.features?.energy ?? null
            };
            saveTrack(entry);
            analyzed.push(entry);
          } catch (err) {
            console.warn(`❌ Skipped ${file}: ${err.message}`);
          }
        }
        done++;
        mainWindow.webContents.send('progress-update', {
          percent: Math.round((done/total)*100),
          current: file
        });
      }
    }
    return { analyzed };
  });

  // Add handler to clear the tracks database
  const db = require('./src/db/init.js');
  ipcMain.handle('clear-database', async () => {
    try {
      db.exec('DELETE FROM tracks');
      return { success: true };
    } catch (err) {
      console.error('Error clearing database:', err);
      return { error: err.message };
    }
  });

}); // end app.whenReady

// JSON export handler
ipcMain.handle('export-analyzed-to-json', async (_, filePaths) => {
  try {
    const exportData = filePaths.map(p => ({ path: p }));
    const exportPath = path.join(os.homedir(), 'Desktop', 'analyzed_export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    return { path: exportPath };
  } catch (err) {
    return { error: err.message };
  }
});

// macOS quit & activate
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
