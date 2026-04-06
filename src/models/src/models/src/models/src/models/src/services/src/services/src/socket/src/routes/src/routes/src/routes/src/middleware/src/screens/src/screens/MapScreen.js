import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    Text,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import io from 'socket.io-client';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ route, navigation }) {
    const { busId, routeId } = route.params;
    const [busLocation, setBusLocation] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [eta, setEta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const mapRef = useRef(null);

    useEffect(() => {
        initializeSocket();
        fetchRouteData();
        
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    const initializeSocket = async () => {
        const token = await AsyncStorage.getItem('token');
        const newSocket = io('http://localhost:5000', {
            auth: { token }
        });
        
        newSocket.on('connect', () => {
            console.log('Socket connected');
            newSocket.emit('track:bus', { busId });
        });
        
        newSocket.on('location:update', (data) => {
            setBusLocation(data.location);
            if (mapRef.current && data.location) {
                mapRef.current.animateToRegion({
                    latitude: data.location.latitude,
                    longitude: data.location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01
                }, 1000);
            }
        });
        
        setSocket(newSocket);
    };

    const fetchRouteData = async () => {
        try {
            const response = await api.get(`/buses/${busId}/route`);
            const route = response.data;
            
            // Create path from stops
            const path = route.stops.map(stop => ({
                latitude: stop.latitude,
                longitude: stop.longitude
            }));
            setRoutePath(path);
            
            // Get ETA to last stop
            const lastStop = route.stops[route.stops.length - 1];
            const etaResponse = await api.get(`/buses/${busId}/eta/${lastStop._id}`);
            setEta(etaResponse.data);
            
        } catch (error) {
            console.error('Error fetching route:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: -22.9406,
                    longitude: 30.4859,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421
                }}
            >
                {busLocation && (
                    <Marker
                        coordinate={{
                            latitude: busLocation.latitude,
                            longitude: busLocation.longitude
                        }}
                        title="Bus Location"
                        pinColor="#3498db"
                    />
                )}
                
                {routePath.length > 0 && (
                    <Polyline
                        coordinates={routePath}
                        strokeColor="#e74c3c"
                        strokeWidth={3}
                    />
                )}
            </MapView>
            
            <View style={styles.infoPanel}>
                <Text style={styles.etaText}>
                    ⏰ ETA: {eta?.minutes || 'Calculating'} minutes
                </Text>
                {eta?.estimatedArrival && (
                    <Text style={styles.arrivalText}>
                        Arrives at: {new Date(eta.estimatedArrival).toLocaleTimeString()}
                    </Text>
                )}
                <TouchableOpacity 
                    style={styles.alertButton}
                    onPress={() => navigation.navigate('Alerts')}
                >
                    <Text style={styles.alertButtonText}>View Alerts</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    map: {
        width: width,
        height: height
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    infoPanel: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84
    },
    etaText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5
    },
    arrivalText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10
    },
    alertButton: {
        backgroundColor: '#e74c3c',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center'
    },
    alertButtonText: {
        color: 'white',
        fontWeight: 'bold'
    }
});
