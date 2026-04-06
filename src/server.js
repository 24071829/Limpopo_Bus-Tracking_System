// backend/src/server.js - RENDER-OPTIMIZED VERSION
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// CRITICAL: Allow all Render origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://*.onrender.com',
    'https://bus-tracking-backend.onrender.com'
];

// Configure CORS for Render
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.some(allowed => 
            origin === allowed || 
            (allowed.includes('*.onrender.com') && origin.includes('onrender.com'))
        )) {
            callback(null, true);
        } else {
            console.log('Origin blocked:', origin);
            callback(null, true); // Still allow for testing
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO with Render-compatible configuration
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all during testing
        methods: ["GET", "POST"],
        credentials: true,
        transports: ['websocket', 'polling']
    },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

// Make io accessible to routes
app.set('io', io);

// Health check endpoint (REQUIRED for Render)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Bus Tracking API is running!',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api: '/api',
            websocket: 'ws://' + req.get('host')
        }
    });
});

// Import your routes
const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const routeRoutes = require('./routes/routes');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    socket.on('track:bus', (data) => {
        console.log(`📡 Tracking bus: ${data.busId}`);
        socket.join(`bus:${data.busId}`);
    });
    
    socket.on('bus:location', async (data) => {
        io.to(`bus:${data.busId}`).emit('location:update', data);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Database connection with retry logic
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-tracking';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {  // IMPORTANT: Listen on 0.0.0.0 for Render
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket ready`);
});

// Connect to database
connectDB();

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

module.exports = { app, server, io };
