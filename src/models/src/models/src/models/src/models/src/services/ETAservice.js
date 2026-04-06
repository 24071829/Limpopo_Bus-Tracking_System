const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Alert = require('../models/Alert');
const redis = require('redis');

class ETAService {
    constructor() {
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL
        });
        this.redisClient.connect().catch(console.error);
        this.CACHE_TTL = 60; // 60 seconds
    }

    async calculateETA(busId, stopId) {
        try {
            // Check cache
            const cacheKey = `eta:${busId}:${stopId}`;
            const cached = await this.redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            // Get bus and route data
            const bus = await Bus.findById(busId).populate('routeId');
            if (!bus || !bus.routeId) {
                throw new Error('Bus or route not found');
            }

            const route = bus.routeId;
            const targetStop = route.stops.find(s => s._id.toString() === stopId);
            
            if (!targetStop) {
                throw new Error('Stop not found on route');
            }

            // Calculate current position on route
            const currentPosition = await this.getPositionOnRoute(bus, route);
            
            // Calculate remaining distance
            const remainingDistance = this.calculateRemainingDistance(route, currentPosition, targetStop.order);
            
            // Calculate ETA based on speed and traffic
            const averageSpeed = bus.currentSpeed || 30; // km/h
            let baseTime = (remainingDistance / averageSpeed) * 60; // minutes
            
            // Apply traffic factor
            const trafficFactor = await this.getTrafficFactor(bus.currentLocation);
            baseTime *= trafficFactor;
            
            // Add buffer for stops
            const stopsRemaining = targetStop.order - currentPosition.currentStopOrder;
            baseTime += stopsRemaining * 2; // 2 minutes per stop
            
            // Check for delays
            const activeAlerts = await Alert.find({
                busId: bus._id,
                isResolved: false,
                type: { $in: ['delay', 'traffic', 'accident'] }
            });
            
            if (activeAlerts.length > 0) {
                baseTime += activeAlerts.length * 5; // 5 minutes per alert
            }
            
            const eta = {
                minutes: Math.round(baseTime),
                seconds: Math.round(baseTime * 60),
                estimatedArrival: new Date(Date.now() + baseTime * 60000),
                confidence: this.calculateConfidence(trafficFactor, activeAlerts.length),
                distance: remainingDistance,
                stopsRemaining: stopsRemaining,
                trafficFactor: trafficFactor
            };
            
            // Cache the result
            await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(eta));
            
            return eta;
            
        } catch (error) {
            console.error('ETA calculation error:', error);
            return {
                minutes: 30,
                seconds: 1800,
                estimatedArrival: new Date(Date.now() + 1800000),
                confidence: 'low',
                error: error.message
            };
        }
    }

    async getPositionOnRoute(bus, route) {
        if (!bus.currentLocation || !bus.currentLocation.latitude) {
            return { currentStopOrder: 0, distanceFromStart: 0 };
        }
        
        let closestStop = null;
        let minDistance = Infinity;
        
        for (let i = 0; i < route.stops.length; i++) {
            const stop = route.stops[i];
            const distance = this.calculateDistance(
                bus.currentLocation.latitude,
                bus.currentLocation.longitude,
                stop.latitude,
                stop.longitude
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestStop = stop;
            }
        }
        
        return {
            currentStopOrder: closestStop ? closestStop.order : 0,
            distanceFromStart: minDistance
        };
    }

    calculateRemainingDistance(route, currentPosition, targetStopOrder) {
        let totalDistance = 0;
        let startOrder = currentPosition.currentStopOrder;
        
        if (startOrder >= targetStopOrder) return 0;
        
        for (let i = startOrder; i < targetStopOrder; i++) {
            const stop1 = route.stops.find(s => s.order === i);
            const stop2 = route.stops.find(s => s.order === i + 1);
            
            if (stop1 && stop2) {
                totalDistance += this.calculateDistance(
                    stop1.latitude, stop1.longitude,
                    stop2.latitude, stop2.longitude
                );
            }
        }
        
        return totalDistance;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    async getTrafficFactor(location) {
        // Get time of day factor
        const hour = new Date().getHours();
        let timeFactor = 1.0;
        
        if (hour >= 7 && hour <= 9) timeFactor = 1.5; // Morning rush
        else if (hour >= 16 && hour <= 19) timeFactor = 1.6; // Evening rush
        else if (hour >= 22 || hour <= 5) timeFactor = 0.9; // Night
        
        // Check for traffic alerts
        const trafficAlerts = await Alert.find({
            type: 'traffic',
            isResolved: false,
            createdAt: { $gte: new Date(Date.now() - 3600000) }
        });
        
        const alertFactor = 1 + (trafficAlerts.length * 0.1);
        
        return timeFactor * alertFactor;
    }

    calculateConfidence(trafficFactor, alertCount) {
        let confidence = 1.0;
        
        if (trafficFactor > 1.3) confidence *= 0.7;
        if (alertCount > 0) confidence *= 0.8;
        if (trafficFactor < 0.95) confidence *= 0.9;
        
        if (confidence > 0.8) return 'high';
        if (confidence > 0.6) return 'medium';
        return 'low';
    }

    async updateAllETAs() {
        try {
            const buses = await Bus.find({ status: 'active' }).populate('routeId');
            
            for (const bus of buses) {
                if (bus.routeId && bus.routeId.stops.length > 0) {
                    const lastStop = bus.routeId.stops[bus.routeId.stops.length - 1];
                    const eta = await this.calculateETA(bus._id, lastStop._id);
                    
                    bus.estimatedArrival = eta.estimatedArrival;
                    await bus.save();
                }
            }
            
            console.log(`Updated ETAs for ${buses.length} buses`);
        } catch (error) {
            console.error('Error updating ETAs:', error);
        }
    }
}

module.exports = ETAService;
