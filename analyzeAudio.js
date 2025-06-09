const mm = require('music-metadata-browser');
const fs = require('fs');
const { Essentia, EssentiaWASM } = require('essentia.js');
const essentiaAlgorithms = require('./src/data/essentiaAlgorithms.js');
const extractBPM = require('./src/utils/extractBPM.js');


async function analyzeAudio(filePath) {
  try {
  const { default: decode } = await import('audio-decode');
  const buffer = fs.readFileSync(filePath);
  const ext = filePath.split('.').pop();
  const metadata = await mm.parseBuffer(buffer, ext);
  const audioBuffer = await decode(buffer);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  if (channelData.length < sampleRate) {
    throw new Error('Audio file is too short for analysis. Please use a file at least 1 second long.');
  }

  const channelCount = audioBuffer.numberOfChannels;
  let monoData;

  if (channelCount > 1) {
    // Downmix to mono by averaging all channels
    const length = audioBuffer.length;
    monoData = new Float32Array(length);
    for (let c = 0; c < channelCount; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        monoData[i] = (monoData[i] || 0) + data[i] / channelCount;
      }
    }
  } else {
    monoData = channelData;
  }

  // Normalize audio to [-1, 1]
  let max = 0;
  for (let i = 0; i < monoData.length; i++) {
    if (Math.abs(monoData[i]) > max) max = Math.abs(monoData[i]);
  }
  if (max > 0) {
    for (let i = 0; i < monoData.length; i++) {
      monoData[i] /= max;
    }
  }


  const essentia = new Essentia(EssentiaWASM);
 
  const analyzeLength = Math.min(monoData.length, 30 * sampleRate);
  const slicedData = monoData.slice(0, analyzeLength); // Limit to 30 seconds for analysis
    
  let audioVector;
  try {
      audioVector = essentia.arrayToVector(Array.from(slicedData));
  } catch (err) {
    console.error('Failed to convert audio data to vector:', err);
    throw err;
  }

  if (!essentia.RhythmExtractor2013) {
  throw new Error('EssentiaWASM failed to load correctly.');
  }

  //BPM EXTRACTION
  const bpmData = extractBPM(audioVector, essentia);
  const bpm = bpmData?.bpm || null;
  const beats = bpmData?.beats || [];
  const beatCount = bpmData?.count || 0;
  const danceability = bpmData?.danceability || null;

  // KEY EXTRACTION
  let keyIndex = null;
  let scale = null;

  try {
    const keyResult = essentia.KeyExtractor(audioVector);
    keyIndex = keyResult.key;
    scale = keyResult.scale;
    /* console.log('Key index:', keyIndex, 'Scale:', scale); */
  } catch (err) {
    console.warn('Could not extract key:', err);
  }


  return {
    format:  metadata.format.container,
    duration: metadata.format.duration,
    sampleRate: metadata.format.sampleRate,
    bitrate: metadata.format.bitrate,
    bpm,
    beats,
    beatCount,
    danceability,
    key: { keyIndex, scale }
  };
  
} catch (error) {
    console.error(':octagonal_sign: analyzeAudio failed:', error, 'typeof:', typeof error);
   /*  throw new Error(typeof err === 'number' ? `Essentia error code ${error}` : error.message || error); */
    const msg =
      typeof error === 'number'
        ? `Essentia error code ${error}`
        : error instanceof Error
          ? error.message
          : String(error);
    throw new Error(msg);
}
}
module.exports = { analyzeAudio };