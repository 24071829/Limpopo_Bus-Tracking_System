const Bus = require('../models/Bus');
const Alert = require('../models/Alert');
const ETAService = require('../services/ETAService');

class RealtimeHandler {
    constructor(server) {
        this.io = server;
        this.activeConnections = new Map();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);
            
            // Handle bus registration
            socket.on('bus:register', async (data) => {
                await this.handleBusRegistration(socket, data);
            });
            
            // Handle location updates
            socket.on('bus:location', async (data) => {
                await this.handleLocationUpdate(socket, data);
            });
            
            // Handle passenger tracking
            socket.on('track:bus', async (data) => {
                await this.handleTrackBus(socket, data);
            });
            
            // Handle ETA request
            socket.on('eta:request', async (data) => {
                await this.handleETARequest(socket, data);
            });
            
            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    async handleBusRegistration(socket, data) {
        const { busId, driverId, busNumber } = data;
        
        try {
            // Store connection
            this.activeConnections.set(busId, {
                socketId: socket.id,
                busNumber: busNumber,
                driverId: driverId,
                connectedAt: new Date()
            });
            
            // Join bus room
            socket.join(`bus:${busId}`);
            
            // Update bus status
            await Bus.findByIdAndUpdate(busId, { 
                status: 'active',
                updatedAt: new Date()
            });
            
            socket.emit('bus:registered', { success: true, busId });
            console.log(`✅ Bus ${busNumber} registered`);
            
        } catch (error) {
            console.error('Bus registration error:', error);
            socket.emit('error', { message: 'Registration failed' });
        }
    }

    async handleLocationUpdate(socket, data) {
        const { busId, location, speed, heading } = data;
        
        try {
            // Validate location
            if (!this.isValidLocation(location.latitude, location.longitude)) {
                return;
            }
            
            // Update bus in database
            await Bus.findByIdAndUpdate(busId, {
                currentLocation: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    lastUpdate: new Date()
                },
                currentSpeed: speed,
                heading: heading
            });
            
            // Broadcast to all tracking users
            const updateData = {
                busId,
                location,
                speed,
                heading,
                timestamp: new Date()
            };
            
            this.io.to(`tracking:${busId}`).emit('location:update', updateData);
            
            // Check for speeding
            if (speed > 80) {
                await this.handleSpeedingAlert(busId, speed, location);
            }
            
        } catch (error) {
            console.error('Location update error:', error);
        }
    }

    async handleTrackBus(socket, data) {
        const { busId, userId, stopId } = data;
        
        try {
            // Join tracking room
            socket.join(`tracking:${busId}`);
            
            // Store tracking relation
            if (!this.activeConnections.has(`track:${userId}`)) {
                this.activeConnections.set(`track:${userId}`, new Set());
            }
            this.activeConnections.get(`track:${userId}`).add(busId);
            
            // Send initial location
            const bus = await Bus.findById(busId);
            if (bus && bus.currentLocation) {
                socket.emit('location:update', {
                    busId,
                    location: bus.currentLocation,
                    speed: bus.currentSpeed,
                    timestamp: bus.currentLocation.lastUpdate
                });
            }
            
            // Send ETA if stop specified
            if (stopId) {
                await this.handleETARequest(socket, { busId, stopId });
            }
            
            console.log(`📱 User ${userId} tracking bus ${busId}`);
            
        } catch (error) {
            console.error('Track bus error:', error);
        }
    }

    async handleETARequest(socket, data) {
        const { busId, stopId } = data;
        
        try {
            const etaService = new ETAService();
            const eta = await etaService.calculateETA(busId, stopId);
            
            socket.emit('eta:response', {
                busId,
                stopId,
                eta: eta
            });
            
        } catch (error) {
            console.error('ETA request error:', error);
            socket.emit('error', { message: 'ETA calculation failed' });
        }
    }

    async handleSpeedingAlert(busId, speed, location) {
        const alertService = new ETAService(); // Actually should use AlertService
        const bus = await Bus.findById(busId);
        
        // Create speeding alert
        const alert = {
            busId: busId,
