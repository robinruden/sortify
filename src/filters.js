// src/filters.js
const { mapLength } = require('./utils/lengthMapper.js');


/**
 * Read all the UI controls and return a “filters” object.
 */
function getFilters({ search, bpmSlider, bpmExact, lengthSlider }) {
  const keyBtn = document.querySelector('.note-button.selected');
  /* console.log('🔍 Key button:', keyBtn); */
   const keyValues = keyBtn
    ? keyBtn.dataset.note.split(',').map(s => s.trim())
    : [];
    
  const scaleBtn = document.querySelector('.mode-button.selected');

  /* console.log('🔍 Filter debug:', {
    keyBtn: keyBtn?.dataset.note,
    scaleBtn: scaleBtn?.dataset.mode,
    keyBtnElement: keyBtn,
    scaleBtnElement: scaleBtn
  }); */
  
  const raw = parseFloat(lengthSlider.value);
  const max = parseFloat(lengthSlider.max);
  const lengthMax = mapLength(raw, max, 12)

  return {
    name:     search.value.trim().toLowerCase(),
    /* key:     keyValues ? keyValues.dataset.note : null, */
    keyValues,
    scale:   scaleBtn ? scaleBtn.dataset.mode : null,
   /*  key:      key.value.trim().toLowerCase(), */
    /* scale:    scale.value.trim().toLowerCase(), */
    bpmRange: bpmSlider.noUiSlider.get().map(v => parseInt(v, 10)),
    exactBpm: parseInt(bpmExact.value, 10),
    lengthMax
  };
}

/**
 * Return true if `file` passes all of the given filters.
 */
function matches(file, filters) {

const {
  name, 
  keyValues, 
  scale, 
  bpmRange, 
  exactBpm, 
  lengthMax
} = filters;

  // lowercase the filename
  const filename = file.path.split(/[/\\]/).pop().toLowerCase();

  // case‐insensitive search
 if (name) {
   const terms = name.split(/\s+/).filter(t => t.length);
    if (!terms.every(term => filename.includes(term))) {
      return false;
    }
  }
  

  // key/scale also case‐insensitive
 /*  if (key && (file.key?.toLowerCase() !== key)) return false; */
  if (keyValues.length) {
    const fileKey = file.key.toLowerCase();
    if (!keyValues.includes(fileKey)) {
      return false;
    }
  }
  if (scale && (file.scale?.toLowerCase() !== scale)) return false;

  // BPM filtering
  const [bpmMin, bpmMax] = bpmRange;
  if (!isNaN(exactBpm)) {
    if (file.bpm == null || Math.round(file.bpm) !== exactBpm) return false;
  } else {
    if (file.bpm != null && (file.bpm < bpmMin || file.bpm > bpmMax)) return false;
  }
  // length filtering
  if (file.duration != null && file.duration > lengthMax) return false;

  return true;
}

module.exports = { getFilters, matches };
