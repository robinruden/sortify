//init.js
const { app} = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

const userDataDir = app.getPath('userData');
const dbFile = path.join(userDataDir, 'audio_analysis.db');

const db = new Database(dbFile);
console.log('🔍 Opening SQLite at', dbFile);

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE,
    format TEXT,
    duration REAL,
    sampleRate INTEGER,
    bpm REAL,
    key TEXT,
    scale TEXT,
    energy REAL
  )
`);

module.exports = db;
