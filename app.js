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




// Server-side socket.io code
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinRoom', (room) => {
        // Leave all other rooms first
        socket.rooms.forEach(r => {
            if (r !== socket.id) {
                socket.leave(r);
            }
        });
        
        // Join the new room
        socket.join(room);
        
        // Notify room members
        io.to(room).emit('userJoined', { room: room });
        console.log(`User ${socket.id} joined room ${room}`);
    });

    // Drawing events
    socket.on('draw-start', (data) => {
        // Broadcast to room only, excluding sender
        socket.to(data.room).emit('draw-start', data);
    });

    socket.on('draw-move', (data) => {
        socket.to(data.room).emit('draw-move', data);
    });

    socket.on('draw-end', (data) => {
        socket.to(data.room).emit('draw-end', data);
    });

    socket.on('erase', (data) => {
        socket.to(data.room).emit('erase', data);
    });

    socket.on('erase-end', (data) => {
        socket.to(data.room).emit('erase-end', data);
    });

    socket.on('draw-line', (data) => {
        socket.to(data.room).emit('draw-line', data);
    });

    socket.on('draw-circle', (data) => {
        socket.to(data.room).emit('draw-circle', data);
    });

    socket.on('draw-rectangle', (data) => {
        socket.to(data.room).emit('draw-rectangle', data);
    });

    socket.on('draw-triangle', (data) => {
        socket.to(data.room).emit('draw-triangle', data);
    });

    socket.on('add-text', (data) => {
        socket.to(data.room).emit('add-text', data);
    });

    socket.on('move-text', (data) => {
        socket.to(data.room).emit('move-text', data);
    });

    socket.on('clear-canvas', (data) => {
        socket.to(data.room).emit('clear-canvas', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Notify rooms this user was in
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                io.to(room).emit('userLeft', { room: room });
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});