const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Join room based on user role
        socket.on('join_room', (data) => {
            const { userId, role } = data;
            socket.join(`user_${userId}`);
            socket.join(`role_${role}`);
            console.log(`👤 User ${userId} (${role}) joined their room`);
        });

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });

    console.log('✅ Socket.IO initialized');
    return io;
};

// Emit notification to a specific user
const notifyUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
        console.log(`📨 Notification sent to user_${userId}: ${event}`);
    }
};

// Emit notification to all contractors
const notifyContractors = (event, data) => {
    if (io) {
        io.to('role_contractor').emit(event, data);
        console.log(`📢 Broadcast to all contractors: ${event}`);
    }
};

// Emit notification to all engineers
const notifyEngineers = (event, data) => {
    if (io) {
        io.to('role_site_engineer').emit(event, data);
    }
};

const getIO = () => {
    if (!io) throw new Error('Socket.IO not initialized');
    return io;
};

module.exports = { initSocket, notifyUser, notifyContractors, notifyEngineers, getIO };
