const mm = require('music-metadata-browser');
const fs = require('fs');
const { Essentia, EssentiaWASM } = require('essentia.js');

async function analyzeAudio(filePath) {
  try {
  const { default: decode } = await import('audio-decode');
  const buffer = fs.readFileSync(filePath);
  const ext = filePath.split('.').pop();
  const metadata = await mm.parseBuffer(buffer, ext);

  const audioBuffer = await decode(buffer);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const essentia = new Essentia(EssentiaWASM);
  const audioVector = essentia.arrayToVector(Array.from(channelData));

  const { bpm } = essentia.RhythmExtractor2013(audioVector, sampleRate)
  const { key: keyIndex, scale } = essentia.KeyExtractor(audioVector, sampleRate);

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