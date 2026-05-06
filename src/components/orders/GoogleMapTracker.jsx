import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';

/**
 * Google Maps integration for real-time order tracking
 * Shows driver polyline, ETA, distance
 * REQUIRES: Google Maps API key in index.html
 */
export default function GoogleMapTracker({ driverLat, driverLng, deliveryLat, deliveryLng, driverName, eta }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);

  useEffect(() => {
    // Check if Google Maps API is loaded
    if (!window.google) {
      console.warn('Google Maps API not loaded. Add to index.html: <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY"></script>');
      return;
    }

    if (!mapRef.current) return;

    // Initialize map centered between driver and destination
    const centerLat = (driverLat + deliveryLat) / 2;
    const centerLng = (driverLng + deliveryLng) / 2;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 14,
      center: { lat: centerLat, lng: centerLng },
      mapTypeControl: false,
      fullscreenControl: false
    });

    setMap(mapInstance);
    setDirectionsService(new window.google.maps.DirectionsService());
    setDirectionsRenderer(new window.google.maps.DirectionsRenderer({
      map: mapInstance,
      polylineOptions: { strokeColor: 'hsl(var(--strawberry))', strokeWeight: 4 }
    }));

    // Add markers
    new window.google.maps.Marker({
      position: { lat: driverLat, lng: driverLng },
      map: mapInstance,
      title: driverName || 'Driver',
      icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });

    new window.google.maps.Marker({
      position: { lat: deliveryLat, lng: deliveryLng },
      map: mapInstance,
      title: 'Delivery Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    });
  }, [driverLat, driverLng, deliveryLat, deliveryLng, driverName]);

  // Request directions (polyline route)
  useEffect(() => {
    if (!directionsService || !directionsRenderer) return;

    directionsService.route({
      origin: { lat: driverLat, lng: driverLng },
      destination: { lat: deliveryLat, lng: deliveryLng },
      travelMode: window.google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
      } else {
        console.warn('Directions request failed:', status);
      }
    });
  }, [directionsService, directionsRenderer, driverLat, driverLng, deliveryLat, deliveryLng]);

  return (
    <Card className="overflow-hidden">
      <div ref={mapRef} className="w-full h-96 bg-muted" />
      {eta && (
        <div className="p-4 bg-card border-t border-border">
          <p className="text-sm font-medium">ETA: {eta} minutos</p>
        </div>
      )}
    </Card>
  );
}