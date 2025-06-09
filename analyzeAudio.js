const mm = require('music-metadata-browser');
const fs = require('fs');
const { Essentia, EssentiaWASM } = require('essentia.js');


async function analyzeAudio(filePath) {
  try {
  const { default: decode } = await import('audio-decode');
  const buffer = fs.readFileSync(filePath);
  const ext = filePath.split('.').pop();
  const metadata = await mm.parseBuffer(buffer, ext);
  /* console.log('Metadata:', metadata); */
  const audioBuffer = await decode(buffer);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  // Check if audio is long enough for analysis (e.g., at least 1 second)
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

  let bpm = null;
  let keyIndex = null;
  let scale = null;

  try {
    console.log('Running RhythmExtractor2013...');
    console.log("Audio vector: ", audioVector);
    console.log("Sample rate: ", sampleRate);
    const rhythmResult = essentia.RhythmExtractor2013(audioVector);
    console.log('RhythmExtractor2013 completed successfully.');
    console.log('Rhythm result:', rhythmResult);
    console.log('BPM:', rhythmResult.bpm, 'beats_position:', rhythmResult.beats_position, 'beats_count:', rhythmResult.beats_count, "danceability: ", rhythmResult.danceability);  
    bpm = rhythmResult.bpm;
    console.log('BPM:', bpm);
  } catch (err) {
    console.warn('Could not extract BPM:', err);
  }
  try {
    const keyResult = essentia.KeyExtractor(audioVector);
    keyIndex = keyResult.key;
    scale = keyResult.scale;
    console.log('Key index:', keyIndex, 'Scale:', scale);
  } catch (err) {
    console.warn('Could not extract key:', err);
  }
  return {
    format:  metadata.format.container,
    duration: metadata.format.duration,
    sampleRate: metadata.format.sampleRate,
    bitrate: metadata.format.bitrate,
    bpm,
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