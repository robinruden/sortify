//search.js

const db = require('./init'); // or wherever your DB connection is

function searchTracks({ bpmMin, bpmMax, key, format, tags }) {
  let query = 'SELECT * FROM tracks WHERE 1=1';
  const params = [];

  if (bpmMin !== undefined) {
    query += ' AND bpm >= ?';
    params.push(bpmMin);
  }
  if (bpmMax !== undefined) {
    query += ' AND bpm <= ?';
    params.push(bpmMax);
  }
  if (key) {
    query += ' AND key = ?';
    params.push(key);
  }
  if (format) {
    query += ' AND format = ?';
    params.push(format);
  }

  return db.prepare(query).all(...params);
}

module.exports = { searchTracks };
