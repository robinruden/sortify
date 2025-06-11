const db = require('./init');

function saveTrack(entry) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO tracks (path, format, duration, sampleRate, bpm, key, scale, energy)
    VALUES (@path, @format, @duration, @sampleRate, @bpm, @key, @scale, @energy)
  `);
  stmt.run(entry);
}

function isAlreadyIndexed(filePath) {
  const stmt = db.prepare(`SELECT id FROM tracks WHERE path = ?`);
  return stmt.get(filePath) !== undefined;
}

module.exports = { saveTrack, isAlreadyIndexed };
