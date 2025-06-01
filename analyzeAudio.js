const mm = require('music-metadata-browser');
const fs = require('fs');

async function analyzeAudio(filePath) {
  const buffer = fs.readFileSync(filePath);
  const metadata = await mm.parseBuffer(buffer, filePath.split('.').pop());
  return {
    format: metadata.format.container,
    duration: metadata.format.duration,
    sampleRate: metadata.format.sampleRate,
    bitrate: metadata.format.bitrate
  };
}

module.exports = { analyzeAudio };
