//init.js

const Database = require('better-sqlite3');
const db = new Database('audio_analysis.db');

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
