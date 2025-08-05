// src/previewPlayer.js
/* const { type } = require('os'); */
const { pathToFileURL } = require('url');



class PreviewPlayer {
  constructor() {
    this.audio      = null;
    this.currentEl  = null;
    this.volume     = 0.7; 
    /* console.log('PreviewPlayer initialized with default volume:', this.volume); */
  }

  toggle(filePath, element, volume) {
    const url = pathToFileURL(filePath).href;
    if (this.audio && this.audio.src === url) return this.stop();
    this.stop();

    if (typeof volume === 'number') this.volume = volume;

    this.audio = new Audio(url);
    this.audio.volume = this.volume

    console.log(`🔊 Playing preview: ${filePath} at volume ${this.volume}`);
   

    this.currentEl = element;
    const icon = document.createElement('span');
    icon.textContent = '🔊 ';
    icon.className = 'preview-icon';
    element.prepend(icon);

    this.audio.play().catch(console.error);
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

   setVolume(vol) {
    this.volume = vol;
    console.log(`🔊 Volume set to ${vol}`);
    if (this.audio) this.audio.volume = vol;
  }

}
module.exports = PreviewPlayer;
