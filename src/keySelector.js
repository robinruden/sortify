/** 
* @param {Function} applyFilter 
*/

class MusicKeySelector {
            constructor(applyFilter){
                this.applyFilter = applyFilter;
                this.selectedNote = null;
                this.selectedMode = null;
                this.init();
            }

            init() {
                this.bindEvents();
                this.bindClose()
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
            bindClose() {
                const btn = document.getElementById('close-key-modal');
                if (!btn) return;
                btn.addEventListener('click', () => {
                    const container = document.querySelector('.key-scale-container');
                    if (container) {
                    container.classList.add('hidden');
                    }
                });
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