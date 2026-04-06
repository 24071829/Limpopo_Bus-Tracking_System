const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus'
    },
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route'
    },
    type: {
        type: String,
        enum: ['delay', 'accident', 'breakdown', 'traffic', 'weather', 'route_change', 'speeding', 'deviation'],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    location: {
        latitude: Number,
        longitude: Number
    },
    affectedStops: [String],
    estimatedDuration: Number, // in minutes
    isResolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
alertSchema.index({ createdAt: -1 });
alertSchema.index({ busId: 1, isResolved: 1 });
alertSchema.index({ routeId: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
