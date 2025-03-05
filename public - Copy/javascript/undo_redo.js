class HistoryManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.undoStack = [];
        this.redoStack = [];
        this.initializeButtons();
        this.saveInitialState();
    }

    initializeButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');

        undoBtn.addEventListener('click', () => this.undo());
        redoBtn.addEventListener('click', () => this.redo());
        this.updateButtonStates();
    }

    saveInitialState() {
        this.saveState('initial');
    }

    saveState(actionName) {
        const state = {
            imageData: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
            textObjects: [...textObjects], // Reference your global textObjects array
            actionName: actionName
        };
        this.undoStack.push(state);
        this.redoStack = []; // Clear redo stack when new action is performed
        this.updateButtonStates();
    }

    undo() {
        if (this.undoStack.length <= 1) return; // Keep initial state

        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        const previousState = this.undoStack[this.undoStack.length - 1];
        this.ctx.putImageData(previousState.imageData, 0, 0);
        textObjects = [...previousState.textObjects]; // Update global textObjects

        this.updateButtonStates();
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);

        this.ctx.putImageData(nextState.imageData, 0, 0);
        textObjects = [...nextState.textObjects]; // Update global textObjects

        this.updateButtonStates();
    }

    updateButtonStates() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');
        
        undoBtn.disabled = this.undoStack.length <= 1; // Disable if only initial state remains
        redoBtn.disabled = this.redoStack.length === 0;
    }
}

// Initialize history manager after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboard');
    window.historyManager = new HistoryManager(canvas);
});