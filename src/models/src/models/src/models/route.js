const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    order: {
        type: Number,
        required: true
    },
    estimatedTimeFromPrevious: Number,
    isMajorStop: {
        type: Boolean,
        default: false
    },
    facilities: [String]
});

const routeSchema = new mongoose.Schema({
    routeName: {
        type: String,
        required: true
    },
    routeCode: {
        type: String,
        required: true,
        unique: true
    },
    startPoint: {
        type: String,
        required: true
    },
    endPoint: {
        type: String,
        required: true
    },
    totalDistance: {
        type: Number,
        required: true,
        min: 0
    },
    estimatedDuration: {
        type: Number,
        required: true,
        min: 1
    },
    fare: {
        type: Number,
        required: true,
        min: 0
    },
    stops: [stopSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    operatingHours: {
        start: { type: String, default: '05:00' },
        end: { type: String, default: '22:00' }
    },
    frequency: {
        peak: { type: Number, default: 15 }, // minutes
        offPeak: { type: Number, default: 30 }
    },
    color: {
        type: String,
        default: '#3498db'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Method to get stop by order
routeSchema.methods.getStopByOrder = function(order) {
    return this.stops.find(stop => stop.order === order);
};

// Method to calculate distance between stops
routeSchema.methods.getDistanceBetweenStops = function(stop1Order, stop2Order) {
    // Simplified - would use actual distance calculation
    return Math.abs(stop2Order - stop1Order) * 1.5; // km
};

module.exports = mongoose.model('Route', routeSchema);
