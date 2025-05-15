'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Fix Leaflet icon issues in Next.js
const useLeafletFix = () => {
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });
    }
  }, []);
};

export default function Map({ 
  center = [39.8283, -98.5795], // Default center of US
  zoom = 5, 
  waypoints = [],
  onMapClick,
  height = '600px'
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);
  
  useLeafletFix();

  // Initialize map on component mount
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Create map instance
      mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      // Add click handler if provided
      if (onMapClick) {
        mapInstanceRef.current.on('click', (e) => {
          onMapClick([e.latlng.lat, e.latlng.lng]);
        });
      }
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Add or update route when waypoints change
  useEffect(() => {
    // Only add routing if we have a map and at least 2 waypoints
    if (mapInstanceRef.current && waypoints.length >= 2) {
      // Remove existing routing control if it exists
      if (routingControlRef.current) {
        mapInstanceRef.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }

      // Convert waypoints to Leaflet format
      const leafletWaypoints = waypoints.map(([lat, lng]) => L.latLng(lat, lng));

      // Create new routing control
      routingControlRef.current = L.Routing.control({
        waypoints: leafletWaypoints,
        routeWhileDragging: true,
        showAlternatives: true,
        fitSelectedRoutes: true,
        lineOptions: {
          styles: [{ color: '#3388ff', weight: 6 }]
        }
      }).addTo(mapInstanceRef.current);

      // Fit map to the route
      if (leafletWaypoints.length > 0) {
        mapInstanceRef.current.fitBounds(L.latLngBounds(leafletWaypoints));
      }
    }
  }, [waypoints]);

  return <div ref={mapRef} style={{ height, width: '100%' }}></div>;
}
