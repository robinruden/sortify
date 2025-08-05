// src/previewPlayer.js
const { type } = require('os');
const { pathToFileURL } = require('url');

class PreviewPlayer {
  constructor() {
    this.audio = null;
    this.currentEl = null;
    this.volume = 0.7; 
  }

  toggle(filePath, element, volume) {
    const url = pathToFileURL(filePath).href;

    // If clicking the same file, stop
    if (this.audio && this.audio.src === url) {
      return this.stop();
    }
    // Otherwise stop any existing and start new
    this.stop();

    // Use passed-in volume if given, otherwise use stored this.volume
    const vol = (typeof volume === 'number') ? volume : this.volume;

    this.audio = new Audio(url);
    this.audio.volume = vol;
    this.volume = vol;   // Remember for next toggle

    this.currentEl = element;
    const icon = document.createElement('span');
    icon.textContent = '🔊 ';
    icon.className = 'preview-icon';
    element.prepend(icon);

    this.audio.play().catch(err => console.error('Preview failed:', err));
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    if (this.currentEl) {
      const icon = this.currentEl.querySelector('.preview-icon');
      if (icon) icon.remove();
    }
    this.audio = null;
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.audio) this.audio.volume = volume;
  }
}

module.exports = PreviewPlayer;
