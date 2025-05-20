'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Component to recenter map when props change
function MapController({ waypoints, vehicles, traccarDevices }) {
  const map = useMap();
  
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(wp => [wp.lat, wp.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (vehicles && vehicles.length > 0) {
      const bounds = L.latLngBounds(vehicles.map(v => [v.location_lat, v.location_lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (traccarDevices && traccarDevices.length > 0) {
      const bounds = L.latLngBounds(traccarDevices.map(d => [d.latitude, d.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, waypoints, vehicles, traccarDevices]);
  
  return null;
}

export default function Map({ 
  waypoints = [], 
  vehicles = [], 
  traccarDevices = [],
  selectedVehicleId = null,
  selectedDeviceId = null,
  onMarkerClick = null,
  onDeviceClick = null
}) {
  const [mounted, setMounted] = useState(false);

  // Move the Leaflet icon fix inside the component
  useEffect(() => {
    setMounted(true);
    
    // Fix Leaflet marker icon issue
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);

  // Custom markers for different vehicle statuses
  const getVehicleIcon = (status) => {
    return new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41]
    });
  };

  // Custom icon for Traccar devices
  const getTraccarIcon = () => {
    return new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41],
      className: 'traccar-marker' // Add a class to style differently if needed
    });
  };

  if (!mounted) return null;
  
  // Set default center
  const defaultCenter = [51.505, -0.09]; // Default to London if no waypoints/vehicles
  const zoom = 13;
  
  // Determine initial center based on waypoints, vehicles, or devices
  let center = defaultCenter;
  if (waypoints.length > 0) {
    center = [waypoints[0].lat, waypoints[0].lng];
  } else if (vehicles.length > 0 && vehicles[0].location_lat && vehicles[0].location_lng) {
    center = [vehicles[0].location_lat, vehicles[0].location_lng];
  } else if (traccarDevices.length > 0 && traccarDevices[0].latitude && traccarDevices[0].longitude) {
    center = [traccarDevices[0].latitude, traccarDevices[0].longitude];
  }
  
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '500px', width: '100%' }} 
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {waypoints.map((waypoint, index) => (
        <Marker key={`waypoint-${index}`} position={[waypoint.lat, waypoint.lng]}>
          <Popup>
            {waypoint.name || `Waypoint ${index + 1}`}
          </Popup>
        </Marker>
      ))}
      
      {vehicles.map((vehicle) => (
        <Marker 
          key={`vehicle-${vehicle.id}`} 
          position={[vehicle.location_lat, vehicle.location_lng]}
          icon={getVehicleIcon(vehicle.status)}
          eventHandlers={{
            click: () => {
              if (onMarkerClick) onMarkerClick(vehicle);
            }
          }}
        >
          <Popup>
            <div>
              <h3 className="font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
              <p>VIN: {vehicle.vin}</p>
              <p>Status: {vehicle.status}</p>
              <p>Location: {vehicle.location}</p>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {traccarDevices.map((device) => (
        <Marker
          key={`device-${device.id}`}
          position={[device.latitude, device.longitude]}
          icon={getTraccarIcon()}
          eventHandlers={{
            click: () => {
              if (onDeviceClick) onDeviceClick(device);
            }
          }}
        >
          <Popup>
            <div>
              <h3 className="font-bold">{device.name}</h3>
              <p>ID: {device.id}</p>
              <p>Status: {device.status || 'N/A'}</p>
              <p>Last Update: {new Date(device.lastUpdate).toLocaleString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}
      
      <MapController waypoints={waypoints} vehicles={vehicles} traccarDevices={traccarDevices} />
    </MapContainer>
  );
}
