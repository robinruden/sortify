const db = require('./init');

function getTracksByBPM(min, max) {
  const stmt = db.prepare(`SELECT * FROM tracks WHERE bpm BETWEEN ? AND ?`);
  return stmt.all(min, max);
}

function getAllTracks() {
  const stmt = db.prepare(`SELECT * FROM tracks`);
  return stmt.all();
}

// Add more queries as needed (key, scale, energy…)

module.exports = {
  getTracksByBPM,
  getAllTracks
};

