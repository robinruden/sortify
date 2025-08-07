// extractKey.js
// Helper for extracting musical key index, scale, and human-readable note name from an Essentia result

const NOTE_NAMES = [
  'C','C♯/D♭','D','D♯/E♭','E',
  'F','F♯/G♭','G','G♯/A♭','A',
  'A♯/B♭','B'
];

/**
 * Extracts musical key index, scale, and human-readable note name from an Essentia KeyExtractor result.
 * Handles both string and vector outputs.
 *
 * @param {Essentia.Vector|Array<number>} audioVector - the audio data to analyze
 * @param {Essentia} essentia                      - an initialized Essentia instance
 * @returns {{ keyIndex: number|null, scale: string|null, noteName: string|null }}
 */
function extractKey(audioVector, essentia) {
  try {
    // Run Essentia key extraction
    const result = essentia.KeyExtractor(audioVector);
    console.log('🔍 KeyExtractor raw result:', result);

    // Prepare outputs
    let keyIndex = null;
    let noteName = null;
    const scale = typeof result.scale === 'string' ? result.scale : null;

    // If Essentia returns a string key
    if (typeof result.key === 'string') {
      noteName = result.key;
      keyIndex = NOTE_NAMES.findIndex(name => name.split('/')[0] === noteName);
      if (keyIndex === -1) keyIndex = null;
    }
   
    // Else if it returns a vector/array, find the max index
    else {
      let keyArray = [];
      const rawKey = result.key;
      if (Array.isArray(rawKey)) {
        keyArray = rawKey;
      } else if (typeof rawKey.toArray === 'function') {
        keyArray = rawKey.toArray();
      } else if (rawKey.data && Array.isArray(rawKey.data)) {
        keyArray = rawKey.data;
      }
      /* console.log('🔢 Converted keyArray length:', keyArray.length); */
      if (keyArray.length === 12) {
        const maxVal = Math.max(...keyArray);
        keyIndex = keyArray.indexOf(maxVal);
        noteName = NOTE_NAMES[keyIndex] || null;
      }
    }

   
    return { keyIndex, scale, noteName };
  } catch (err) {
    console.warn('KeyExtractor failed:', err);
    return { keyIndex: null, scale: null, noteName: null };
  }
}

module.exports = extractKey;
