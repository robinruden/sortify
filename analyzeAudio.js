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
  /* console.log('Sample rate:', sampleRate); */
  const channelData = audioBuffer.getChannelData(0);
  /* console.log('channeldata:', channelData); */

  // Check if audio is long enough for analysis (e.g., at least 1 second)
  if (channelData.length < sampleRate) {
    throw new Error('Audio file is too short for analysis. Please use a file at least 1 second long.');
  }

  const essentia = new Essentia(EssentiaWASM);
  const audioVector = essentia.arrayToVector(Array.from(channelData));
  /* console.log('audioVector:', audioVector); */

  let bpm = null;
  let keyIndex = null;
  let scale = null;
  try {
    const rhythmResult = essentia.RhythmExtractor2013(audioVector, sampleRate);
    bpm = rhythmResult.bpm;
  } catch (err) {
    console.warn('Could not extract BPM:', err);
  }
  try {
    const keyResult = essentia.KeyExtractor(audioVector, sampleRate);
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
    console.error('🛑 analyzeAudio failed:', error, 'typeof:', typeof error);
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