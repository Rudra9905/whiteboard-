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
    } else if (tool === 'erase') {
        isErasing = true;
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
    } else if (tool === 'erase' && isErasing) {
        ctx.clearRect(e.offsetX, e.offsetY, size, size);
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (tool === 'draw' && isDrawing) {
        isDrawing = false;
        ctx.closePath();
        historyManager.saveState('draw');
    } else if (tool === 'erase' && isErasing) {
        isErasing = false;
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
