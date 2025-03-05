const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Home Page Route
app.get("/", (req, res) => {
    res.render("index");
});

// Drawing Board Route
app.get("/drawing", (req, res) => {
    res.render("drawing");
});

io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('joinRoom', (roomCode) => {
        // Leave previous rooms
        socket.rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });
        
        // Join new room
        socket.join(roomCode);
        io.to(roomCode).emit('userJoined', { room: roomCode });
        
        console.log(`Client ${socket.id} joined room ${roomCode}`);
    });

    // Update all drawing events to use rooms
    socket.on('draw-start', (data) => {
        socket.to(data.room).emit('draw-start', data);
    });
    socket.on('draw-move', (data) => {
        socket.to(data.room).emit('draw-move', data);
    });
    socket.on('draw-end', () => socket.broadcast.emit('draw-end'));
    socket.on('erase', (data) => socket.broadcast.emit('erase', data));
    

    socket.on('save-canvas-state', (state) => {
        socket.broadcast.emit('remote-canvas-state', state);
    });

    // Broadcast undo action to all other clients
    socket.on('canvas-undo', () => {
        socket.broadcast.emit('remote-canvas-undo');
    });

    // Broadcast redo action to all other clients
    socket.on('canvas-redo', () => {
        socket.broadcast.emit('remote-canvas-redo');
    });

    // Handle shape events
    socket.on('draw-line', (data) => socket.broadcast.emit('draw-line', data));
    socket.on('draw-circle', (data) => socket.broadcast.emit('draw-circle', data));
    socket.on('draw-rectangle', (data) => socket.broadcast.emit('draw-rectangle', data));
    socket.on('draw-triangle', (data) => socket.broadcast.emit('draw-triangle', data));
    
    // Handle text events
    socket.on('add-text', (data) => socket.broadcast.emit('add-text', data));
    

    socket.on('save-whiteboard', (saveData) => {
        socket.broadcast.emit('remote-whiteboard-saved', saveData);
    });

    // Handle whiteboard load
    socket.on('load-whiteboard', (saveData) => {
        socket.broadcast.emit('remote-whiteboard-loaded', saveData);
    });

    // Handle whiteboard delete
    socket.on('delete-whiteboard', (key) => {
        socket.broadcast.emit('remote-whiteboard-deleted', key);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});