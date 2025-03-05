class HistoryManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.undoStack = [];
        this.redoStack = [];
        this.socket = io(); // Initialize Socket.IO
        this.isRestoringState = false; // Flag to prevent recursive state saving
        
        this.initializeButtons();
        this.saveInitialState();
        this.initializeSocketListeners();
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
            textObjects: JSON.parse(JSON.stringify(textObjects || [])),
            actionName: actionName
        };

        // Only save if the new state is different from the last state
        const lastState = this.undoStack[this.undoStack.length - 1];
        if (!this.isStateSame(lastState, state)) {
            this.undoStack.push(state);
            this.redoStack = []; // Clear redo stack
            
            // Emit state to other clients
            this.socket.emit('save-canvas-state', state);
        }

        this.updateButtonStates();
    }

    // Helper method to compare states
    isStateSame(state1, state2) {
        if (!state1 || !state2) return false;
        
        // Compare image data
        const imageData1 = state1.imageData;
        const imageData2 = state2.imageData;
        
        if (imageData1.width !== imageData2.width || 
            imageData1.height !== imageData2.height) {
            return false;
        }

        // Optionally, do a deep comparison of pixel data
        const data1 = imageData1.data;
        const data2 = imageData2.data;
        
        for (let i = 0; i < data1.length; i++) {
            if (data1[i] !== data2[i]) {
                return false;
            }
        }

        // Compare text objects
        return JSON.stringify(state1.textObjects) === JSON.stringify(state2.textObjects);
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

        // Emit undo to other clients
        this.socket.emit('canvas-undo');
    }

    redo() {
        if (this.redoStack.length === 0) return;

        this.isRestoringState = true;
        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);

        this.restoreState(nextState);
        
        this.isRestoringState = false;
        this.updateButtonStates();

        // Emit redo to other clients
        this.socket.emit('canvas-redo');
    }

    restoreState(state) {
        if (!state) return;

        // Restore canvas image data
        this.ctx.putImageData(state.imageData, 0, 0);
        
        // Restore text objects
        textObjects = JSON.parse(JSON.stringify(state.textObjects || []));
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
        // Listen for state updates from other clients
        this.socket.on('remote-canvas-state', (state) => {
            if (!this.isRestoringState) {
                this.undoStack.push(state);
                this.redoStack = [];
                this.updateButtonStates();
            }
        });

        // Listen for undo events from other clients
        this.socket.on('remote-canvas-undo', () => {
            if (!this.isRestoringState) {
                this.undo();
            }
        });

        // Listen for redo events from other clients
        this.socket.on('remote-canvas-redo', () => {
            if (!this.isRestoringState) {
                this.redo();
            }
        });
    }
}

// Initialize history manager after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboard');
    if (canvas) {
        window.historyManager = new HistoryManager(canvas);
    }
});

// Server-side Socket.IO setup (in your Node.js/Express server file)
// You'll need to implement these event handlers on the server
// const io = require('socket.io')(server);

// io.on('connection', (socket) => {
//     // Broadcast state save to all other clients
//     socket.on('save-state', (state) => {
//         socket.broadcast.emit('state-saved', state);
//     });

//     // Broadcast undo action to all other clients
//     socket.on('undo-action', () => {
//         socket.broadcast.emit('remote-undo');
//     });

//     // Broadcast redo action to all other clients
//     socket.on('redo-action', () => {
//         socket.broadcast.emit('remote-redo');
//     });
// });

// // Initialize history manager after the DOM is loaded
// document.addEventListener('DOMContentLoaded', () => {
//     const canvas = document.getElementById('whiteboard');
//     window.historyManager = new HistoryManager(canvas);
// });