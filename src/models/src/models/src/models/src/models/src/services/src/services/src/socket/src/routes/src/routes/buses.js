// backend/src/routes/buses.js - SIMPLIFIED
const express = require('express');
const router = express.Router();

// Mock bus data for testing
const mockBuses = [
    {
        _id: '1',
        busNumber: 'BUS001',
        status: 'active',
        currentLocation: {
            latitude: -22.9406,
            longitude: 30.4859
        },
        currentSpeed: 45
    },
    {
        _id: '2',
        busNumber: 'BUS002',
        status: 'active',
        currentLocation: {
            latitude: -22.9500,
            longitude: 30.4750
        },
        currentSpeed: 38
    }
];

// Get all buses
router.get('/', (req, res) => {
    res.json(mockBuses);
});

// Get bus by ID
router.get('/:id', (req, res) => {
    const bus = mockBuses.find(b => b._id === req.params.id);
    if (!bus) {
        return res.status(404).json({ error: 'Bus not found' });
    }
    res.json(bus);
});

// Health check for buses endpoint
router.get('/health/check', (req, res) => {
    res.json({ status: 'buses endpoint working' });
});

module.exports = router;
