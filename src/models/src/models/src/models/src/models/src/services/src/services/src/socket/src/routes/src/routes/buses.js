const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const auth = require('../middleware/auth');

// Get all active buses
router.get('/', async (req, res) => {
    try {
        const buses = await Bus.find({ status: 'active' })
            .populate('routeId', 'routeName routeCode')
            .populate('driverId', 'fullName');
        
        res.json(buses);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bus by ID
router.get('/:id', async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id)
            .populate('routeId')
            .populate('driverId', 'fullName phoneNumber');
        
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        
        res.json(bus);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update bus location (protected)
router.put('/:id/location', auth, async (req, res) => {
    try {
        const { latitude, longitude, speed, heading } = req.body;
        
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        
        bus.currentLocation = {
            latitude,
            longitude,
            lastUpdate: new Date()
        };
        bus.currentSpeed = speed || bus.currentSpeed;
        bus.heading = heading || bus.heading;
        
        await bus.save();
        
        // Emit via socket
        const io = req.app.get('io');
        io.to(`tracking:${bus._id}`).emit('location:update', {
            busId: bus._id,
            location: bus.currentLocation,
            speed: bus.currentSpeed,
            timestamp: new Date()
        });
        
        res.json(bus);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bus ETA to stop
router.get('/:busId/eta/:stopId', async (req, res) => {
    try {
        const ETAService = require('../services/ETAService');
        const etaService = new ETAService();
        
        const eta = await etaService.calculateETA(req.params.busId, req.params.stopId);
        
        res.json(eta);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bus route with stops
router.get('/:id/route', async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id).populate('routeId');
        
        if (!bus || !bus.routeId) {
            return res.status(404).json({ error: 'Route not found' });
        }
        
        res.json(bus.routeId);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
