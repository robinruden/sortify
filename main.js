//main.js
require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`)
});


const { globalShortcut, app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const analyzeAudio = require('./src/analyzeAudio.js');

const { saveTrack, isAlreadyIndexed } = require('./src/db/insert.js');
const { getTracksByBPM } = require('./src/db/query.js');

const os = require('os');

const { shell } = require('electron');

ipcMain.on('drag-start', (event, filePath) => {
  // Öppnar filens plats i Finder när man drar ut
  shell.showItemInFolder(filePath);
});

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

  globalShortcut.register('CommandOrControl+R', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  // ANALYZE SINGLE FILE
ipcMain.handle('drop-and-analyze-folders-with-progress', async (_, folderPaths) => {
  const analyzed = [];

  for (const folder of folderPaths) {
    const files = await walkDir(folder);
    const audioFiles = files.filter(f => /\.(mp3|wav)$/i.test(f));
    const total = audioFiles.length;
    let done = 0;

    for (const file of audioFiles) {
      if (isAlreadyIndexed(file)) {
        done++;
        mainWindow.webContents.send('progress-update', {
          percent: Math.round((done / total) * 100),
          current: file,
        });
        continue;
      }

      try {
        const analysis = await analyzeAudio(file);
        const entry = {
          path: file,
          format: analysis.format,
          duration: analysis.duration,
          sampleRate: analysis.sampleRate,
          bpm: analysis.features?.bpm || null,
          key: analysis.features?.key || null,
          scale: analysis.features?.scale || null,
          energy: analysis.features?.energy || null
        };

        saveTrack(entry);
        analyzed.push(entry);
      } catch (err) {
        console.warn(`❌ Skippade ${file}: ${err.message}`);
      }

      done++;
      mainWindow.webContents.send('progress-update', {
        percent: Math.round((done / total) * 100),
        current: file,
      });
    }
  }

  return { analyzed };
});


});

ipcMain.handle('export-analyzed-to-json', async (_, filePaths) => {
  try {
    const exportData = filePaths.map(p => ({
      path: p
    }));

    const exportPath = path.join(os.homedir(), 'Desktop', 'analyzed_export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    return { path: exportPath };
  } catch (err) {
    return { error: err.message };
  }
});

