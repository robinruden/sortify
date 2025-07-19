// src/previewPlayer.js
const { pathToFileURL } = require('url');

class PreviewPlayer {
  constructor() {
    this.audio = null;
    this.currentEl = null;
  }

  toggle(filePath, element, volume = 1) {
    const url = pathToFileURL(filePath).href;

    // If clicking the same file, stop
    if (this.audio && this.audio.src === url) {
      return this.stop();
    }
    // Otherwise stop any existing and start new
    this.stop();
    this.audio = new Audio(url);
    this.audio.volume = volume;
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
    if (this.audio) this.audio.volume = volume;
  }
}

module.exports = PreviewPlayer;
