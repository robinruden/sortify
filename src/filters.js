// src/filters.js

/**
 * Read all the UI controls and return a “filters” object.
 */
function getFilters(DOM) {
  return {
    name:     DOM.search.value.trim().toLowerCase(),
    key:      DOM.key.value.trim().toLowerCase(),
    scale:    DOM.scale.value.trim().toLowerCase(),
    bpmRange: DOM.bpmSlider.noUiSlider.get().map(v => parseInt(v, 10)),
    exactBpm: parseInt(DOM.bpmExact.value, 10),
    lengthMax: parseFloat(DOM.lengthSlider.value),
  };
}

/**
 * Return true if `file` passes all of the given filters.
 */
function matches(file, { name, key, scale, bpmRange, exactBpm, lengthMax }) {
  // lowercase the filename
  const filename = file.path.split(/[/\\]/).pop().toLowerCase();

  // case‐insensitive search
  if (!filename.includes(name)) return false;

  // key/scale also case‐insensitive
  if (key && (file.key?.toLowerCase() !== key)) return false;
  if (scale && (file.scale?.toLowerCase() !== scale)) return false;

  const [bpmMin, bpmMax] = bpmRange;
  if (!isNaN(exactBpm)) {
    if (file.bpm == null || Math.round(file.bpm) !== exactBpm) return false;
  } else {
    if (file.bpm != null && (file.bpm < bpmMin || file.bpm > bpmMax)) return false;
  }

  if (file.duration != null && file.duration > lengthMax) return false;

  return true;
}

module.exports = { getFilters, matches };
