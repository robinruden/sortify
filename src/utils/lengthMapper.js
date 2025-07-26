/**
 * Map a raw slider value [0…max] through an exponential ease-in curve.
 * @param {number} raw        current slider value
 * @param {number} max        slider’s max value
 * @param {number} exponent   curve exponent (>=1). Higher → flatter left side
 * @returns {number} actual length
 */
function mapLength(raw, max, exponent = 12) {
  const t      = raw / max;
  const factor = (Math.exp(exponent * t) - 1) / (Math.exp(exponent) - 1);
  return factor * max;
}

module.exports = { mapLength };