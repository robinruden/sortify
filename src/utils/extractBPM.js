function extractBPM(audioVector, essentia) {
  try {
    if (!essentia.RhythmExtractor2013) {
      throw new Error('Essentia rhythm algorithm not loaded');
    }

    const result = essentia.RhythmExtractor2013(audioVector);
    return {
      bpm: result.bpm,
      beats: result.beats_position,
      count: result.beats_count,
      danceability: result.danceability
    };
  } catch (err) {
    console.warn('extractBPM error:', err.message);
    return null;
  }
}

module.exports = extractBPM;