// src/filters.js

/**
 * Read all the UI controls and return a “filters” object.
 */
function getFilters(DOM) {
  return {
    name:     DOM.search.value.toLowerCase(),
    key:      DOM.key.value.toLowerCase(),
    scale:    DOM.scale.value.toLowerCase(),
    bpmRange: DOM.bpmSlider.noUiSlider.get().map(v => parseInt(v, 10)),
    exactBpm: parseInt(DOM.bpmExact.value, 10),
    energyMin: parseFloat(DOM.energySlider.value),
    lengthMax: parseFloat(DOM.lengthSlider.value),
  };
}

/**
 * Return true if `file` passes all of the given filters.
 */
function matches(file, { name, key, scale, bpmRange, exactBpm, energyMin, lengthMax }) {
  const filename = file.path.split(/[/\\]/).pop().toLowerCase();
  if (name && !filename.includes(name)) return false;
  if (key && (file.key?.toLowerCase() !== key)) return false;
  if (scale && (file.scale?.toLowerCase() !== scale)) return false;

  const [bpmMin, bpmMax] = bpmRange;
  if (!isNaN(exactBpm)) {
    if (file.bpm == null || Math.round(file.bpm) !== exactBpm) return false;
  } else {
    if (file.bpm != null && (file.bpm < bpmMin || file.bpm > bpmMax)) return false;
  }

  if (file.energy != null && file.energy < energyMin) return false;
  if (file.duration != null && file.duration > lengthMax) return false;

  return true;
}

module.exports = { getFilters, matches };
