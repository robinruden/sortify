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
 
  const bitrate = metadata.format.bitrate;

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
    bitrate,
    features: {}
  };

  // BPM
  try {
    const { bpm, count} = extractBPM(audioVector, essentia);
    result.features.bpm = bpm;
    result.features.beatCount = count;
  } catch (err) {
    
  }

  // Key
  try {
    const { keyIndex, noteName, scale } = extractKey(audioVector, essentia);
    result.features.keyIndex = keyIndex;
    result.features.key = noteName;
    result.features.scale = scale;
  } catch (e) {
    result.features.key = null;
    result.features.scale = null;
    result.features.keyIndex = null;
  }

  // Energy
  try {
    result.features.energy = essentia.Energy(audioVector).energy;
  } catch (e) {
    result.features.energy = null;
  }

  // Flatness
   try {
    const spectrum = essentia.Spectrum(vector);
    result.features.flatness = essentia.Flatness(spectrum);
  } catch (err) {
    result.features.flatness = null;
  }

  console.log('🎧 Analysis Result:\n', JSON.stringify(result, null, 2));

  return result;
}
module.exports = analyzeAudio;
