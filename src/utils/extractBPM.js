function extractBPM(audioVector, essentia, sampleRate) {
  try {
    if (!essentia.RhythmExtractor2013) {
      throw new Error('Essentia rhythm algorithm not loaded');
    }

    const result = essentia.RhythmExtractor2013(audioVector, sampleRate);
    console.log('🪘 Raw rhythm output:', result);
    return {
      bpm: result.bpm,
      beats: result.beats_position || [],
      count: result.beats_count || 0,
      danceability: typeof result.danceability === 'number' 
        ? result.danceability
        : null
    };
  } catch (err) {
    console.warn('extractBPM error:', err.message);
    return { bpm: null, beats: [], count: 0, danceability: null };
  }
}

module.exports = extractBPM;