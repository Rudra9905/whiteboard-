class SaveFileManager {
    constructor(canvas, ctx, socket, room) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.socket = socket; // Socket.IO connection
        this.room = room; // Store the room ID
        this.modal = null;
        this.initializeModal();
        this.initializeButtons();
        this.initializeSocketListeners();
    }

    initializeModal() {
        if (!document.getElementById('savedFilesModal')) {
            const modalHTML = `
                <div class="modal fade" id="savedFilesModal" tabindex="-1" aria-labelledby="savedFilesModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="savedFilesModalLabel">Saved Whiteboards - Room: ${this.room}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body" id="savedFilesList">
                                <!-- Saved files will be displayed here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        
        this.modal = new bootstrap.Modal(document.getElementById('savedFilesModal'));
    }

    initializeButtons() {
        // Save button
        const saveBtn = document.getElementById('save');
        saveBtn.addEventListener('click', () => this.saveCanvas());

        // View saved button
        const viewSavedBtn = document.getElementById('view-saved');
        viewSavedBtn.addEventListener('click', () => {
            this.displaySavedFiles();   
            this.modal.show();
        });
    }

    initializeSocketListeners() {
        // Listen for remote save events - only for this room
        this.socket.on('remote-whiteboard-saved', (saveData) => {
            // Only process if it's for our room
            if (saveData.room === this.room) {
                this.saveToLocalStorage(saveData.key, saveData.imageData);
                this.displaySavedFiles();
            }
        });

        // Listen for remote delete events - only for this room
        this.socket.on('remote-whiteboard-deleted', (data) => {
            // Only process if it's for our room
            if (data.room === this.room) {
                localStorage.removeItem(data.key);
                this.displaySavedFiles();
            }
        });

        // Listen for remote load events - only for this room
        this.socket.on('remote-whiteboard-loaded', (saveData) => {
            // Only process if it's for our room
            if (saveData.room === this.room) {
                this.loadRemoteSavedFile(saveData.imageData);
            }
        });
    }

    saveCanvas() {
        try {
            const timestamp = new Date().toISOString();
            // Include room in the key to avoid collisions between rooms
            const key = `whiteboard_${this.room || 'no-room'}_${timestamp}`;
            const imageData = this.canvas.toDataURL();
            
            // Save locally
            this.saveToLocalStorage(key, imageData);
            
            // Only broadcast save if we're in a room
            if (this.room) {
                this.socket.emit('save-whiteboard', { 
                    key: key, 
                    imageData: imageData,
                    room: this.room
                });
            }

            this.showAlert('Canvas saved successfully!', 'success');
        } catch (e) {
            this.showAlert('Error saving canvas', 'error');
        }
    }

    saveToLocalStorage(key, imageData) {
        try {
            localStorage.setItem(key, imageData);
        } catch (e) {
            console.error('Local storage save error:', e);
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed top-0 start-50 translate-middle-x mt-3`;
        alertDiv.style.zIndex = '9999';
        alertDiv.textContent = message;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 2000);
    }

    displaySavedFiles() {
        const savedFilesList = document.getElementById('savedFilesList');
        savedFilesList.innerHTML = '';

        const files = [];
        for(let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Only show files for this room (or no-room if not in a room)
            const roomPrefix = this.room || 'no-room';
            if(key.startsWith(`whiteboard_${roomPrefix}_`)) {
                files.push({
                    key: key,
                    // Extract timestamp from the key
                    date: new Date(key.replace(`whiteboard_${roomPrefix}_`, '').replace(/-/g, ':')).toLocaleString()
                });
            }
        }

        if(files.length === 0) {
            const roomText = this.room ? `for this room` : `(not in a collaborative room)`;
            savedFilesList.innerHTML = `<p class="text-center">No saved whiteboards found ${roomText}.</p>`;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'row row-cols-1 row-cols-md-2 g-4';

        files.forEach((file) => {
            const col = document.createElement('div');
            col.className = 'col';
            
            const card = document.createElement('div');
            card.className = 'card h-100';
            
            const img = document.createElement('img');
            img.src = localStorage.getItem(file.key);
            img.className = 'card-img-top';
            img.style.objectFit = 'contain';
            img.style.height = '200px';
            img.style.backgroundColor = '#f8f9fa';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            const dateText = document.createElement('p');
            dateText.className = 'card-text mb-3';
            dateText.textContent = file.date;

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'd-flex justify-content-between gap-2';

            const loadBtn = document.createElement('button');
            loadBtn.className = 'btn btn-primary flex-grow-1';
            loadBtn.textContent = 'Load';
            loadBtn.onclick = () => this.loadSavedFile(file.key);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger flex-grow-1';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => this.deleteSavedFile(file.key);

            buttonGroup.appendChild(loadBtn);
            buttonGroup.appendChild(deleteBtn);
            cardBody.appendChild(dateText);
            cardBody.appendChild(buttonGroup);

            card.appendChild(img);
            card.appendChild(cardBody);
            col.appendChild(card);
            grid.appendChild(col);
        });

        savedFilesList.appendChild(grid);
    }

    loadSavedFile(key) {
        const savedData = localStorage.getItem(key);
        if(savedData) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0);
                
                // Save state for undo/redo
                window.historyManager?.saveState('load');
                
                // Only broadcast load if we're in a room
                if (this.room) {
                    this.socket.emit('load-whiteboard', { 
                        imageData: savedData,
                        room: this.room
                    });
                }
                
                this.modal.hide();
            };
            img.src = savedData;
        }
    }

    loadRemoteSavedFile(imageData) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
            window.historyManager?.saveState('remote-load');
        };
        img.src = imageData;
    }

    deleteSavedFile(key) {
        if(confirm('Are you sure you want to delete this whiteboard?')) {
            // Remove locally
            localStorage.removeItem(key);
            
            // Only broadcast delete if we're in a room
            if (this.room) {
                this.socket.emit('delete-whiteboard', {
                    key: key,
                    room: this.room
                });
            }
            
            // Refresh display
            this.displaySavedFiles();
        }
    }
}

// Initialize after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');
    const socket = window.socket || io(); // Use global socket if available
    
    // Get room ID from URL parameter or use empty string if no room
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room') || '';
    
    window.saveFileManager = new SaveFileManager(canvas, ctx, socket, room);
});