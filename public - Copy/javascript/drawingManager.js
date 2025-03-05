class DrawingManager {
    constructor(canvas, socket, teamCode) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.socket = socket;
        this.teamCode = teamCode;
        this.isDrawing = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        this.socket.on('drawingData', (data) => {
            this.drawFromServer(data);
        });
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.ctx.beginPath();
        this.ctx.moveTo(e.offsetX, e.offsetY);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const drawData = {
            x: e.offsetX,
            y: e.offsetY,
            color: this.ctx.strokeStyle,
            width: this.ctx.lineWidth
        };

        this.socket.emit('drawing', {
            teamCode: this.teamCode,
            drawData: drawData
        });

        this.drawLine(drawData);
    }

    drawLine(data) {
        this.ctx.lineTo(data.x, data.y);
        this.ctx.strokeStyle = data.color;
        this.ctx.lineWidth = data.width;
        this.ctx.stroke();
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    drawFromServer(data) {
        this.drawLine(data.drawData);
    }
}