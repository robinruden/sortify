//essentiaAlgorithms.js

const essentiaAlgorithms = {

  "Pitch & Key Detection": ["PitchMelodia", "PitchYin", "Key", "KeyExtractor", "TuningFrequency", "PredominantPitchMelodia"],
  "Rhythm & BPM": ["RhythmExtractor", "BeatTrackerDegara", "TempoTap", "OnsetDetection"],
  "Spectral Features": ["SpectralCentroidTime", "MFCC", "Chromagram", "Flatness", "Flux", "RollOff", "SpectralContrast"],
  "Loudness & Energy": ["Loudness", "Energy", "RMS", "PowerMean", "ReplayGain", "InstantPower", "Intensity"],
  "Timbre & Tonal Features": ["TonalExtractor", "Tristimulus", "Dissonance", "Inharmonicity", "Crest", "Centroid"],
  "Signal Processing": ["Resample", "Windowing", "Envelope", "FrameCutter", "LowPass", "HighPass", "DCRemoval", "AutoCorrelation"],
  "Math / Statistics": ["Mean", "Median", "Variance", "CentralMoments", "RawMoments", "DistributionShape"],
  "Machine Learning Input": ["TensorflowInputMusiCNN", "TensorflowInputVGGish"],
  "Model Analysis & Synthesis": ["SprModelAnal", "StochasticModelSynth", "SpsModelSynth"],
  "Miscellaneous": ["Danceability", "ChordsDetection", "CoverSongSimilarity"]

};

module.exports = essentiaAlgorithms