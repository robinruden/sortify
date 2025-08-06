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

            selectNote(button) {
                // Remove previous selection
                console.log('🎵 Note selected:', button.dataset.note);
                document.querySelectorAll('.note-button').forEach(btn => {
                    btn.classList.remove('selected');
                });

                // Add selection to clicked button
                button.classList.add('selected');
                this.selectedNote = button.dataset.note;
                this.updateDisplay();
                if(this.applyFilter) {
                    console.log('🔄 Calling applyFilter...'); 
                    this.applyFilter();
                }
            }

            selectMode(button) {
                console.log('🎼 Mode selected:', button.dataset.mode); 
                // Remove previous selection
                document.querySelectorAll('.mode-button').forEach(btn => {
                    btn.classList.remove('selected');
                });

                // Add selection to clicked button
                button.classList.add('selected');
                this.selectedMode = button.dataset.mode;
                this.updateDisplay();
                if(this.applyFilter) {
                    console.log('🔄 Calling applyFilter...');
                    this.applyFilter();
                }
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