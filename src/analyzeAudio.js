// analyzeAudio.js
// Extracts: BPM, Key, Energy, Length, Spectral Contrast

const mm = require('music-metadata-browser');
const fs = require('fs');
const { Essentia, EssentiaWASM } = require('essentia.js');
const extractBPM = require('./utils/extractBPM.js');
const extractKey = require('./utils/extractKey.js');

// Instantiate Essentia once
const essentia = new Essentia(EssentiaWASM);

async function analyzeAudio(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = filePath.split('.').pop();
  const metadata = await mm.parseBuffer(buffer, ext);
  const format = metadata.format.container;
  const duration = metadata.format.duration;
 
  /* const bitrate = metadata.format.bitrate; */

  const { default: decode } = await import('audio-decode');
  const audioBuffer = await decode(buffer);
  const length      = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  

  if (length < 0.2 * sampleRate) {
    throw new Error('Audio too short for analysis (min 0.2s)');
  }

  const monoData = audioBuffer.getChannelData(0);
  const sliceLength = Math.min(monoData.length, 30 * sampleRate);
  const sliceArray = Array.from(monoData.slice(0, sliceLength));
  const audioVector = essentia.arrayToVector(sliceArray);

    const result = {
    format,
    duration,
    sampleRate,
    features: {}
  };

  // BPM
  try {
    const { bpm } = extractBPM(audioVector, essentia);
    result.features.bpm = bpm;
  } catch (err) {
    
  }

  // Key
  try {
    const { noteName, scale } = extractKey(audioVector, essentia);
    result.features.key = noteName;
    result.features.scale = scale;
  } catch (e) {
    result.features.key = null;
    result.features.scale = null;
  }

  // Energy
  try {
    result.features.energy = essentia.Energy(audioVector).energy;
  } catch (e) {
    result.features.energy = null;
  }

// 5.X Spectral Flatness
/* try {
  const frameCutter = essentia.FrameCutter(audioVector, {
    frameSize: 1024,
    hopSize: 512
  });

  const flatnessVals = [];

  while (true) {
    const frameOut = frameCutter.compute();
    const frame = frameOut.frame;

    if (frame.size() === 0) break;

    const windowed = essentia.Windowing(frame, { type: 'hann' }).windowedFrame;
    const spectrum = essentia.Spectrum(windowed).spectrum;
    const flat = essentia.Flatness(spectrum).flatness;

    flatnessVals.push(flat);
  }

  const avgFlatness =
    flatnessVals.length > 0
      ? flatnessVals.reduce((sum, val) => sum + val, 0) / flatnessVals.length
      : null;

  result.features.flatness = avgFlatness;
} catch (e) {
  const msg = typeof e === 'number' ? `Essentia error code ${e}` : e.message;
  result.features.flatness = { error: msg };
}
 */


  // Tonalness
/* try {
  const melodia = essentia.PredominantPitchMelodia(audioVector);
  const pitchConfidence = essentia.vectorToArray(melodia.pitchConfidence);

  const avgConfidence = pitchConfidence.reduce((a, b) => a + b, 0) / pitchConfidence.length;
  result.features.avgPitchConfidence = avgConfidence;
} catch (e) {
  const msg = typeof e === 'number' ? `Essentia error code ${e}` : e.message;
  result.features.avgPitchConfidence = { error: msg };
} */

  console.log('🎧 Analysis Result:\n', JSON.stringify(result, null, 2));

  return result;
}
module.exports = analyzeAudio;
