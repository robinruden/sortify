// analyzeAudio.js

const mm = require('music-metadata-browser');
const fs = require('fs');
/* const decode = require('audio-decode'); */
const esPkg = require('essentia.js'); 
// esPkg exposes both the Essentia WASM loader and the high‐level API:
const { Essentia, EssentiaWASM } = esPkg;

async function analyzeAudio(filePath) {
  // 1) Load audio-decode via dynamic import (since it's an ESM package)
  const { default: decode } = await import('audio-decode');

  // 1) Read raw file and pull out metadata (container, duration, sampleRate, bitrate)
  const buffer = fs.readFileSync(filePath);
  const ext = filePath.split('.').pop();
  const metadata = await mm.parseBuffer(buffer, ext);

  // 2) Decode raw audio into an AudioBuffer-like object
  //    (audio-decode will infer format from the Buffer’s bytes)
  const audioBuffer = await decode(buffer);
  //    audioBuffer.sampleRate is, e.g., 44100
  //    audioBuffer.numberOfChannels might be >1; we’ll take channel 0
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // Float32Array

  // 3) Instantiate Essentia’s WASM backend
  //    EssentiaWASM is the raw WASM artifact; we pass it to the Essentia constructor
  const essentia = new Essentia(EssentiaWASM);

  // 4) Convert Float32Array → plain JS Array → Essentia Vector
  //    (Essentia’s algorithms expect a “VectorFloat” wrapper, which we get
  //     by calling essentia.arrayToVector([...]) on a normal JS array.)
  const floatArray = Array.from(channelData);
  const audioVector = essentia.arrayToVector(floatArray);

  // 5) Run BPM/tempo estimation (RhythmExtractor2013)
  //    This returns an object whose “bpm” field is the estimated tempo
  const rhythmResult = essentia.RhythmExtractor2013(audioVector, sampleRate);
// └→ rhythmResult.bpm is a Number (e.g. 128.47)
  const bpm = rhythmResult.bpm;

  // 6) Run key extraction
  //    KeyExtractor returns an object with “key” (0–11) and “scale” (e.g. "major" or "minor").
  const keyResult = essentia.KeyExtractor(audioVector, sampleRate);
// └→ keyResult.key is an integer 0–11 (0 = C, 1 = C♯/D♭, etc.), 
//    keyResult.scale is a string ("major" or "minor").
  const detectedKey = {
    keyIndex: keyResult.key,
    scale: keyResult.scale
  };

  // 7) Return everything together
  return {
    format:  metadata.format.container,  // e.g. “mp3”, “wav”
    duration: metadata.format.duration,   // in seconds
    sampleRate: metadata.format.sampleRate,
    bitrate: metadata.format.bitrate,
    bpm,
    key: detectedKey
  };
}

module.exports = { analyzeAudio };
