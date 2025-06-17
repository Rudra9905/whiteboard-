class HistoryManager {
    constructor(canvas, room) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.socket = window.socket || io(); // Use global socket if available
        this.room = room; // Store the room ID
        this.undoStack = [];
        this.redoStack = [];
        this.isRestoringState = false; // Flag to prevent recursive state saving
        this.isRemoteAction = false; // Flag to distinguish local vs remote actions
        
        this.initializeButtons();
        this.initializeSocketListeners();
        this.saveInitialState();
        
        // Join the room
        if (this.room) {
            this.socket.emit('join-room', this.room);
        }
    }

    initializeButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');
        
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undo());
        }
        if (redoBtn) {
            redoBtn.addEventListener('click', () => this.redo());
        }
        
        this.updateButtonStates();
    }

    saveInitialState() {
        this.saveState('initial');
    }

    saveState(actionName = 'action') {
        // Prevent saving state while restoring
        if (this.isRestoringState) return;

        const state = {
            imageData: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
            // Deep clone text objects to avoid reference issues
            textObjects: JSON.parse(JSON.stringify(window.textObjects || [])),
            actionName: actionName,
            timestamp: Date.now() // Add timestamp for better state comparison
        };

        // Only save if the new state is different from the last state
        const lastState = this.undoStack[this.undoStack.length - 1];
        if (!this.isStateSame(lastState, state)) {
            this.undoStack.push(state);
            this.redoStack = []; // Clear redo stack
            
            // Emit state to other clients in the same room (only for local actions)
            if (!this.isRemoteAction && this.room) {
                this.socket.emit('save-canvas-state', {
                    state: {
                        // Don't send the full imageData, just a serializable version
                        imageDataUrl: this.canvas.toDataURL(),
                        textObjects: state.textObjects,
                        actionName: state.actionName,
                        timestamp: state.timestamp
                    },
                    room: this.room
                });
            }
        }

        this.updateButtonStates();
    }

    // Helper method to compare states - simplified to reduce false positives
    isStateSame(state1, state2) {
        if (!state1 || !state2) return false;
        
        // Simple timestamp comparison if available
        if (state1.timestamp && state2.timestamp) {
            return state1.timestamp === state2.timestamp;
        }
        
        // Simple comparison for text objects
        return JSON.stringify(state1.textObjects) === JSON.stringify(state2.textObjects);
        
        // Note: We're skipping pixel-by-pixel comparison as it's very expensive
        // and can cause performance issues in collaborative environments
    }

    undo() {
        if (this.undoStack.length <= 1) return;

        this.isRestoringState = true;
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        const previousState = this.undoStack[this.undoStack.length - 1];
        this.restoreState(previousState);
        
        this.isRestoringState = false;
        this.updateButtonStates();

        // Emit undo to other clients in the same room (only for local actions)
        if (!this.isRemoteAction && this.room) {
            this.socket.emit('canvas-undo', {
                room: this.room
            });
        }
    }

    redo() {
        if (this.redoStack.length === 0) return;

        this.isRestoringState = true;
        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);

        this.restoreState(nextState);
        
        this.isRestoringState = false;
        this.updateButtonStates();

        // Emit redo to other clients in the same room (only for local actions)
        if (!this.isRemoteAction && this.room) {
            this.socket.emit('canvas-redo', {
                room: this.room
            });
        }
    }

    restoreState(state) {
        if (!state) return;

        // Handle both direct imageData and URL-based state restores
        if (state.imageData) {
            // Restore canvas image data directly
            this.ctx.putImageData(state.imageData, 0, 0);
        } else if (state.imageDataUrl) {
            // Restore from image URL
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0);
            };
            img.src = state.imageDataUrl;
        }
        
        // Restore text objects - ensure we're using the right global variable
        window.textObjects = JSON.parse(JSON.stringify(state.textObjects || []));
    }

    updateButtonStates() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');

        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length <= 1;
        }
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    }

    initializeSocketListeners() {
        // Listen for state updates from other clients in the same room
        this.socket.on('remote-canvas-state', (data) => {
            // Only process if it's for our room
            if (data.room === this.room) {
                this.isRemoteAction = true;
                
                // Create a state object from the received data
                const state = {
                    imageDataUrl: data.state.imageDataUrl,
                    textObjects: data.state.textObjects,
                    actionName: data.state.actionName,
                    timestamp: data.state.timestamp
                };
                
                this.undoStack.push(state);
                this.redoStack = [];
                this.restoreState(state);
                this.updateButtonStates();
                
                this.isRemoteAction = false;
            }
        });

        // Listen for undo events from other clients in the same room
        this.socket.on('remote-canvas-undo', (data) => {
            if (data.room === this.room) {
                this.isRemoteAction = true;
                this.undo();
                this.isRemoteAction = false;
            }
        });

        // Listen for redo events from other clients in the same room
        this.socket.on('remote-canvas-redo', (data) => {
            if (data.room === this.room) {
                this.isRemoteAction = true;
                this.redo();
                this.isRemoteAction = false;
            }
        });
    }
}

// Initialize history manager after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboard');
    if (canvas) {
        // Get the room ID from URL or use empty string if no room
        const room = new URLSearchParams(window.location.search).get('room') || '';
        window.historyManager = new HistoryManager(canvas, room);
    }
});