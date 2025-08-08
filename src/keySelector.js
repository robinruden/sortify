/** 
* @param {Function} applyFilter 
*/

class MusicKeySelector {
            constructor(applyFilter){
                this.applyFilter = applyFilter;
                this.container   = document.querySelector('.key-scale-container');
                this.openBtn     = document.getElementById('open-key-modal');
                this.selectedNote = null;
                this.selectedMode = null;
                this.onDocClick  = this.onDocClick.bind(this);
                this.onModalClick = this.onModalClick.bind(this);

                this.init();
            }

            init() {
                this.bindEvents();
                this.bindClose()
                this.bindOpen();

                document.addEventListener('click', this.onDocClick);

                // catch clicks inside the modal
    if (this.container) {
      this.container.addEventListener('click', this.onModalClick);
    }
            }

            bindEvents() {
                // Note button events
                const noteButtons = document.querySelectorAll('.note-button');
                noteButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        this.selectNote(e.target);
                    });
                });

                // Mode button events
                const modeButtons = document.querySelectorAll('.mode-button');
                modeButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        this.selectMode(e.target);
                    });
                });
            }
          bindOpen() {
    if (!this.openBtn) return;
    this.openBtn.addEventListener('click', () => {
      this.container.classList.remove('hidden');
    });
  }

  bindClose() {
    const closeBtn = document.getElementById('close-key-modal');
    if (!closeBtn) return;
    closeBtn.addEventListener('click', () => {
      this.container.classList.add('hidden');
    });
  }
  onModalClick(e) {
    const ignore = e.target.closest('.note-button, .mode-button, #close-key-modal');
    if (!ignore) {
      this.container.classList.add('hidden');
    }
  }
             onDocClick(e) {
    // if modal hidden, nothing to do
    if (!this.container || this.container.classList.contains('hidden')) return;

    // if click was on the open-btn or inside the modal, do nothing
    if (this.openBtn.contains(e.target) || this.container.contains(e.target)) return;

    // otherwise it was outside: hide the modal
    this.container.classList.add('hidden');
  }
            selectNote(button) {
                // Remove previous selection
                /* console.log('🎵 Note selected:', button.dataset.note); */
                const noteButtons = document.querySelectorAll('.note-button');
                const already = button.classList.contains('selected');

                // clear any previous selection
                noteButtons.forEach(btn => btn.classList.remove('selected'));

                if (!already) {
                    // select & store
                    button.classList.add('selected');
                    this.selectedNote = button.dataset.note;
                    } else {
                    // deselect & clear
                    this.selectedNote = null;
                }

                this.updateDisplay();
                if (this.applyFilter) this.applyFilter();
            }

            selectMode(button) {
                /* console.log('🎼 Mode selected:', button.dataset.mode);  */
                // Remove previous selection
                const modeButtons = document.querySelectorAll('.mode-button');
                const already = button.classList.contains('selected');

                modeButtons.forEach(btn => btn.classList.remove('selected'));

              if (!already) {
                button.classList.add('selected');
                this.selectedMode = button.dataset.mode;
            } else {
                this.selectedMode = null;
            }

                this.updateDisplay();
                if (this.applyFilter) this.applyFilter();
    }         

            updateDisplay() {
                const selectedKeyElement = document.getElementById('selected-key');
                
                if (this.selectedNote && this.selectedMode) {
                    selectedKeyElement.textContent = `Selected: ${this.selectedNote} ${this.selectedMode}`;
                    selectedKeyElement.classList.add('visible');
                } else {
                    selectedKeyElement.classList.remove('visible');
                }
            }
        }


        module.exports = { MusicKeySelector };