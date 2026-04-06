const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const User = require('../models/User');
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

// Admin middleware
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.userType !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Dashboard stats
router.get('/dashboard', auth, isAdmin, async (req, res) => {
    try {
        const totalBuses = await Bus.countDocuments();
        const activeBuses = await Bus.countDocuments({ status: 'active' });
        const totalRoutes = await Route.countDocuments({ isActive: true });
        const activeAlerts = await Alert.countDocuments({ isResolved: false });
        const totalUsers = await User.countDocuments({ userType: 'passenger' });
        
        const recentAlerts = await Alert.find({ isResolved: false })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('busId', 'busNumber');
        
        res.json({
            totalBuses,
            activeBuses,
            totalRoutes,
            activeAlerts,
            totalUsers,
            recentAlerts
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create bus
router.post('/buses', auth, isAdmin, async (req, res) => {
    try {
        const bus = new Bus(req.body);
        await bus.save();
        res.status(201).json(bus);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update bus
router.put('/buses/:id', auth, isAdmin, async (req, res) => {
    try {
        const bus = await Bus.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        
        res.json(bus);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete bus
router.delete('/buses/:id', auth, isAdmin, async (req, res) => {
    try {
        const bus = await Bus.findByIdAndDelete(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        
        res.json({ success: true });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create route
router.post('/routes', auth, isAdmin, async (req, res) => {
    try {
        const route = new Route(req.body);
        await route.save();
        res.status(201).json(route);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all routes
router.get('/routes', auth, isAdmin, async (req, res) => {
    try {
        const routes = await Route.find();
        res.json(routes);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create alert
router.post('/alerts', auth, isAdmin, async (req, res) => {
    try {
        const AlertService = require('../services/AlertService');
        const alertService = new AlertService();
        
        const alert = await alertService.createAlert({
            ...req.body,
            createdBy: req.userId
        });
        
        res.status(201).json(alert);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Resolve alert
router.put('/alerts/:id/resolve', auth, isAdmin, async (req, res) => {
    try {
        const AlertService = require('../services/AlertService');
        const alertService = new AlertService();
        
        const alert = await alertService.resolveAlert(req.params.id, req.userId);
        
        res.json(alert);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
