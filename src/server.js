const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import modules
const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const routeRoutes = require('./routes/routes');
const adminRoutes = require('./routes/admin');
const RealtimeHandler = require('./socket/realtimeHandler');
const ETAService = require('./services/ETAService');
const AlertService = require('./services/AlertService');
const TrackingService = require('./services/TrackingService');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// Initialize real-time handler
const realtimeHandler = new RealtimeHandler(server);

// Initialize services
const etaService = new ETAService();
const alertService = new AlertService();
const trackingService = new TrackingService();

// Start background jobs
const startBackgroundJobs = () => {
    // Update ETAs every minute
    setInterval(async () => {
        try {
            await etaService.updateAllETAs();
        } catch (error) {
            console.error('ETA update error:', error);
        }
    }, 60000);
    
    // Clean old GPS data every hour
    setInterval(async () => {
        try {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            await trackingService.cleanOldData(oneWeekAgo);
            console.log('Cleaned old GPS data');
        } catch (error) {
            console.error('Data cleanup error:', error);
        }
    }, 3600000);
    
    console.log('✅ Background jobs started');
};

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 API available at http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket server ready`);
    startBackgroundJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

module.exports = { app, server, io };
