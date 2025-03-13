/* filepath: /e:/Extra/board/public/javascript/Tools.js */
// Initialize socket at the top of file
const socket = io();
let currentRoom = '';

// Replace the existing createRoom and joinRoom functions
function createRoom() {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentRoom = roomCode;
    
    // Update UI
    document.getElementById('currentRoomCode').textContent = roomCode;
    document.getElementById('roomInfo').style.display = 'block';
    
    // Connect to room
    socket.emit('joinRoom', roomCode);
    console.log('Created room:', roomCode); // Debug log

    // Close modal after creating room
    const roomModal = bootstrap.Modal.getInstance(document.getElementById('roomCodeModal'));
    if (roomModal) {
        roomModal.hide();
    }
}

function joinRoom(code) {
    if (!code) {
        console.log('No room code provided');
        return;
    }
    
    currentRoom = code;
    
    // Update UI
    document.getElementById('currentRoomCode').textContent = code;
    document.getElementById('roomInfo').style.display = 'block';
    
    // Connect to room
    socket.emit('joinRoom', code);
    document.getElementById('roomCodeInput').value = '';
    console.log('Joined room:', code); // Debug log
}

// Add room button event listener
document.addEventListener('DOMContentLoaded', () => {
    const roomBtn = document.getElementById('room');
    if (roomBtn) {
        roomBtn.addEventListener('click', () => {
            const roomModal = new bootstrap.Modal(document.getElementById('roomCodeModal'));
            roomModal.show();
        });
    }

    // Add socket event listeners for room events
    socket.on('userJoined', (data) => {
        console.log('User joined:', data);
        // Optional: Show notification that someone joined
        showNotification(`Someone joined room ${data.room}`);
    });
});

// Helper function for notifications
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
} // Remove extra parenthesis

const canvas = document.getElementById('whiteboard');

const ctx = canvas.getContext('2d');

let line = document.getElementById('line');
let triangle = document.getElementById('triangle');
let circle = document.getElementById('circle');
let rectangle = document.getElementById('rectangle');
let text = document.getElementById('text');

let color = '#000000';
let size = 5;
let tool = 'draw';

let isDrawing = false;
let isErasing = false;

let startX, startY;

let textObjects = [];
let selectedText = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

document.getElementById('color').addEventListener('input', (e) => {
    color = e.target.value;
});

document.getElementById('size').addEventListener('input', (e) => {
    size = e.target.value;
    let x = document.querySelector('.size-value');
    x.textContent = size + 'px';
});

document.getElementById('clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    textObjects = [];
    historyManager.saveState('clear');
});

document.getElementById('draw').addEventListener('click', () => setTool('draw'));

document.getElementById('eraser').addEventListener('click', () => setTool('erase'));

line.addEventListener('click', () => setTool('line'));

triangle.addEventListener('click', () => setTool('triangle'));

circle.addEventListener('click', () => setTool('circle'));

text.addEventListener('click', () => setTool('text'));

rectangle.addEventListener('click', () => setTool('rectangle'));


function setTool(too) {
    tool = too;

    document.getElementById('draw').classList.remove('active');
    document.getElementById('eraser').classList.remove('active');
    line.classList.remove('active');
    triangle.classList.remove('active');
    circle.classList.remove('active');
    rectangle.classList.remove('active')


    if (too === 'draw') document.getElementById('draw').classList.add('active');
    if (too === 'erase') document.getElementById('eraser').classList.add('active');
    if (too === 'line') line.classList.add('active');
    if (too === 'triangle') triangle.classList.add('active');
    if (too === 'circle') circle.classList.add('active');
    if (too === 'rectangle') rectangle.classList.add('active');
    
}

canvas.addEventListener('mousedown', (e) => {
    if (tool === 'draw') {
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
        
        // Emit start of drawing to server
        socket.emit('draw-start', {
            room: currentRoom,
            x: e.offsetX,
            y: e.offsetY,
            color: color,
            size: size
        });
    } else if (tool === 'erase') {
        isErasing = true;
        
        // Emit erase event to server
        socket.emit('erase', {
            room: currentRoom,
            x: e.offsetX,
            y: e.offsetY,
            size: size
        });
    } else if (tool === 'line') {
        startX = e.offsetX;
        startY = e.offsetY;
    }
    else if(tool === 'circle')
    {
        startX= e.offsetX;
        startY= e.offsetY;
    }
    else if(tool === 'rectangle' || tool === 'triangle')
    {
        startX= e.offsetX;
        startY= e.offsetY;
    }
    else if (tool === 'text') {
        let t = text.value;
        if (t) {
            ctx.fillStyle = color;
            ctx.font = `${size*2}px Arial`;
            ctx.fillText(t, e.offsetX, e.offsetY);
            
            // Emit text addition to server
            socket.emit('add-text', {
                room: currentRoom,
                text: t,
                x: e.offsetX,
                y: e.offsetY,
                color: color,
                size: size*2
            });
            
            // Store text object
            textObjects.push({
                text: t,
                x: e.offsetX,
                y: e.offsetY,
                color: color,
                size: size*2
            });
            historyManager.saveState('text');
        }
        tool="";
    }
    
});

canvas.addEventListener('mousemove', (e) => {
    if (tool === 'draw' && isDrawing) {
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Emit drawing movement to server
        socket.emit('draw-move', {
            room: currentRoom,
            x: e.offsetX,
            y: e.offsetY,
            color: color,
            size: size
        });
    } else if (tool === 'erase' && isErasing) {
        ctx.clearRect(e.offsetX, e.offsetY, size, size);
        
        // Emit erase movement to server
        socket.emit('erase', {
            room: currentRoom,
            x: e.offsetX,
            y: e.offsetY,
            size: size
        });
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (tool === 'draw' && isDrawing) {
        isDrawing = false;
        ctx.closePath();
        socket.emit('draw-end', { room: currentRoom });
        historyManager.saveState('draw');
    } else if (tool === 'erase' && isErasing) {
        isErasing = false;
        socket.emit('erase-end', { room: currentRoom });
        historyManager.saveState('erase');
    } else if (tool === 'line') {
        const endX = e.offsetX;
        const endY = e.offsetY;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
        ctx.closePath();
        
        // Emit line drawing to server
        socket.emit('draw-line', {
            room: currentRoom,
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: color,
            size: size
        });
        
        historyManager.saveState('line');
    }
    else if(tool === 'circle')
    {
        const endX = e.offsetX;
        const endY = e.offsetY;
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 360);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
        ctx.closePath();
        
        // Emit circle drawing to server
        socket.emit('draw-circle', {
            room: currentRoom,
            startX: startX,
            startY: startY,
            radius: radius,
            color: color,
            size: size
        });
        
        historyManager.saveState('circle');
    }
    else if (tool === 'rectangle') {
        const endX = e.offsetX;
        const endY = e.offsetY;
        const width = endX - startX;
        const height = endY - startY;

        ctx.beginPath();
        ctx.rect(startX, startY, width, height);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
        ctx.closePath();
        
        // Emit rectangle drawing to server
        socket.emit('draw-rectangle', {
            room: currentRoom,
            startX: startX,
            startY: startY,
            width: width,
            height: height,
            color: color,
            size: size
        });
        
        historyManager.saveState('rectangle');
    }

    else if (tool === 'triangle') {
        const endX = e.offsetX;
        const endY = e.offsetY;
    
        ctx.beginPath();
        ctx.moveTo(startX, startY); 
        ctx.lineTo(endX, endY);     
        ctx.lineTo(startX, endY);   
        ctx.closePath();             
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
        
        // Emit triangle drawing to server
        socket.emit('draw-triangle', {
            room: currentRoom,
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: color,
            size: size
        });
        
        historyManager.saveState('triangle');
    }
    
});

canvas.addEventListener('mouseleave', () => {
    if (tool === 'draw' && isDrawing) {
        isDrawing = false;
        ctx.closePath();
    } else if (tool === 'erase' && isErasing) {
        isErasing = false;
    }
});

let down = document.getElementById('download');
down.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
});

let theme = document.getElementById('theme-switch');
theme.addEventListener('change', () => {
    document.body.classList.toggle('dark-theme');
});

// Add new mousedown handler for text selection
canvas.addEventListener('mousedown', (e) => {
textObjects.forEach(textObj => {
ctx.font = `${textObj.size}px Arial`;
let metrics = ctx.measureText(textObj.text);
if (e.offsetX >= textObj.x && 
e.offsetX <= textObj.x + metrics.width &&
e.offsetY >= textObj.y - textObj.size && 
e.offsetY <= textObj.y) {
selectedText = textObj;
isDragging = true;
dragOffsetX = e.offsetX - textObj.x;
dragOffsetY = e.offsetY - textObj.y;
}
});
});

// Modify mousemove event
canvas.addEventListener('mousemove', (e) => {
if (isDragging && selectedText) {
// Clear canvas
ctx.clearRect(0, 0, canvas.width, canvas.height);
// Update text position
selectedText.x = e.offsetX - dragOffsetX;
selectedText.y = e.offsetY - dragOffsetY;
// Redraw all text objects
textObjects.forEach(obj => {
ctx.fillStyle = obj.color;
ctx.font = `${obj.size}px Arial`;
ctx.fillText(obj.text, obj.x, obj.y);
});
} else if (tool === 'draw' && isDrawing) {
// ...existing drawing code...
}
});

// Add mouseup handler
canvas.addEventListener('mouseup', () => {
    if(isDragging)
    {
        historyManager.saveState('move-text');
    }
isDragging = false;
selectedText = null;
});
// Existing code remains the same, with the following additions:

// Add Socket.IO client script at the top of your HTML file
// <script src="/socket.io/socket.io.js"></script>


// Add at the top of file, after socket initialization

// Add room management functions
function createRoom() {
    currentRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit('joinRoom', currentRoom);
    showRoomCode(currentRoom);
}

function joinRoom(roomCode) {
    currentRoom = roomCode;
    socket.emit('joinRoom', roomCode);
    showRoomCode(roomCode);
}

function showRoomCode(code) {
    // Create or update room code display
    let roomDisplay = document.getElementById('roomDisplay');
    if (!roomDisplay) {
        roomDisplay = document.createElement('div');
        roomDisplay.id = 'roomDisplay';
        roomDisplay.className = 'room-display';
        document.querySelector('.toolbar').appendChild(roomDisplay);
    }
    roomDisplay.innerHTML = `Room Code: ${code}`;
}

// Modify drawing event listeners to emit events to the server

// Drawing events
canvas.addEventListener('mousedown', (e) => {
    if (tool === 'draw') {
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
        
        // Emit start of drawing to server
        socket.emit('draw-start', {
            room: currentRoom,
            x: e.offsetX,
            y: e.offsetY,
            color: color,
            size: size
        });
    } else if (tool === 'erase') {
        isErasing = true;
        
        // Emit erase event to server
        socket.emit('erase', {
            room: currentRoom,
            x: e.offsetX,
            y: e.offsetY,
            size: size
        });
    } else if (tool === 'line') {
        startX = e.offsetX;
        startY = e.offsetY;
    } else if (tool === 'circle') {
        startX = e.offsetX;
        startY = e.offsetY;
    } else if (tool === 'rectangle' || tool === 'triangle') {
        startX = e.offsetX;
        startY = e.offsetY;
    } else if (tool === 'text') {
        let t = text.value;
        if (t) {
            ctx.fillStyle = color;
            ctx.font = `${size*2}px Arial`;
            ctx.fillText(t, e.offsetX, e.offsetY);
            
            // Emit text addition to server
            socket.emit('add-text', {
                room: currentRoom,
                text: t,
                x: e.offsetX,
                y: e.offsetY,
                color: color,
                size: size*2
            });
            
            textObjects.push({
                text: t,
                x: e.offsetX,
                y: e.offsetY,
                color: color,
                size: size*2
            });
            historyManager.saveState('text');
        }
        tool = "";
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (tool === 'draw' && isDrawing) {
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Emit drawing movement to server
        socket.emit('draw-move', {
            room: currentRoom,
            x: e.offsetX,
            y: e.offsetY,
            color: color,
            size: size
        });
    } else if (tool === 'erase' && isErasing) {
        ctx.clearRect(e.offsetX, e.offsetY, size, size);
        
        // Emit erase movement to server
        socket.emit('erase', {
            room: currentRoom,
            x: e.offsetX,
            y: e.offsetY,
            size: size
        });
    }
});

canvas.addEventListener('mouseup', (e) => {
    // Drawing events remain the same, but emit respective shape events to server
    if (tool === 'draw' && isDrawing) {
        isDrawing = false;
        ctx.closePath();
        socket.emit('draw-end', { room: currentRoom });
        historyManager.saveState('draw');
    } else if (tool === 'erase' && isErasing) {
        isErasing = false;
        socket.emit('erase-end', { room: currentRoom });
        historyManager.saveState('erase');
    } else if (tool === 'line') {
        const endX = e.offsetX;
        const endY = e.offsetY;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
        ctx.closePath();
        
        // Emit line drawing to server
        socket.emit('draw-line', {
            room: currentRoom,
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: color,
            size: size
        });
        
        historyManager.saveState('line');
    } else if (tool === 'circle') {
        const endX = e.offsetX;
        const endY = e.offsetY;
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 360);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
        ctx.closePath();
        
        // Emit circle drawing to server
        socket.emit('draw-circle', {
            room: currentRoom,
            startX: startX,
            startY: startY,
            radius: radius,
            color: color,
            size: size
        });
        
        historyManager.saveState('circle');
    } else if (tool === 'rectangle') {
        const endX = e.offsetX;
        const endY = e.offsetY;
        const width = endX - startX;
        const height = endY - startY;

        ctx.beginPath();
        ctx.rect(startX, startY, width, height);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
        ctx.closePath();
        
        // Emit rectangle drawing to server
        socket.emit('draw-rectangle', {
            room: currentRoom,
            startX: startX,
            startY: startY,
            width: width,
            height: height,
            color: color,
            size: size
        });
        
        historyManager.saveState('rectangle');
    } else if (tool === 'triangle') {
        const endX = e.offsetX;
        const endY = e.offsetY;
    
        ctx.beginPath();
        ctx.moveTo(startX, startY); 
        ctx.lineTo(endX, endY);     
        ctx.lineTo(startX, endY);   
        ctx.closePath();             
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.stroke();
        
        // Emit triangle drawing to server
        socket.emit('draw-triangle', {
            room: currentRoom,
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: color,
            size: size
        });
        
        historyManager.saveState('triangle');
    }
});

// Add Socket.IO event listeners for collaborative drawing
socket.on('draw-start', (data) => {
    if (data.room === currentRoom) {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.lineCap = 'round';
    }
});

socket.on('draw-move', (data) => {
    if (data.room === currentRoom) {
        ctx.lineTo(data.x, data.y);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.stroke();
    }
});

socket.on('draw-end', () => {
    ctx.closePath();
});

socket.on('erase', (data) => {
    ctx.clearRect(data.x, data.y, data.size, data.size);
});

socket.on('draw-line', (data) => {
    ctx.beginPath();
    ctx.moveTo(data.startX, data.startY);
    ctx.lineTo(data.endX, data.endY);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.stroke();
    ctx.closePath();
});

socket.on('draw-circle', (data) => {
    ctx.beginPath();
    ctx.arc(data.startX, data.startY, data.radius, 0, 360);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.stroke();
    ctx.closePath();
});

socket.on('draw-rectangle', (data) => {
    ctx.beginPath();
    ctx.rect(data.startX, data.startY, data.width, data.height);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.stroke();
    ctx.closePath();
});

socket.on('draw-triangle', (data) => {
    ctx.beginPath();
    ctx.moveTo(data.startX, data.startY); 
    ctx.lineTo(data.endX, data.endY);     
    ctx.lineTo(data.startX, data.endY);   
    ctx.closePath();             
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.stroke();
});

socket.on('add-text', (data) => {
    if (data.room === currentRoom) {
        ctx.fillStyle = data.color;
        ctx.font = `${data.size}px Arial`;
        ctx.fillText(data.text, data.x, data.y);
        
        // Also add to textObjects if needed
        textObjects.push({
            text: data.text,
            x: data.x,
            y: data.y,
            color: data.color,
            size: data.size
        });
    }
});

// Add room-related event listeners
socket.on('userJoined', (data) => {
    console.log(`User joined room ${data.room}`);
});

socket.on('userLeft', (data) => {
    console.log(`User left room ${data.room}`);
});

// Add error handling for socket connection
socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    showNotification('Connection error occurred');
});

// Add room status indicator
function updateRoomStatus(isConnected) {
    const roomBtn = document.getElementById('room');
    if (roomBtn) {
        roomBtn.classList.toggle('connected', isConnected);
        roomBtn.setAttribute('data-tooltip', isConnected ? `Connected to ${currentRoom}` : 'Join Room');
    }
}
