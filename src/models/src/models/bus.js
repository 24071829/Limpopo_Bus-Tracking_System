const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    busNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    registrationNumber: {
        type: String,
        required: true,
        unique: true
    },
    model: String,
    capacity: {
        type: Number,
        required: true,
        min: 10,
        max: 100
    },
    fuelType: {
        type: String,
        enum: ['diesel', 'petrol', 'electric', 'cng'],
        default: 'diesel'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance', 'completed', 'delayed'],
        default: 'inactive'
    },
    currentLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        lastUpdate: Date
    },
    currentSpeed: {
        type: Number,
        default: 0,
        min: 0,
        max: 120
    },
    heading: Number,
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route'
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    nextStop: String,
    estimatedArrival: Date,
    delayMinutes: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
busSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for isLate
busSchema.virtual('isLate').get(function() {
    if (!this.estimatedArrival) return false;
    return this.estimatedArrival < new Date();
});

// Index for geospatial queries
busSchema.index({ 'currentLocation': '2dsphere' });

module.exports = mongoose.model('Bus', busSchema);
