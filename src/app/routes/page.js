'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import apiService from '@/services/api';
import dynamic from 'next/dynamic';

// Import Map component dynamically
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-[400px] bg-gray-200 flex items-center justify-center">Loading Map...</div>
});

export default function RoutesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    if (user && !authLoading) {
      fetchRoutes();
    }
  }, [user, authLoading]);

  const fetchRoutes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.getRoutes();
      if (response.data.success) {
        setRoutes(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedRoute(response.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError('Failed to load routes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[70vh]">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center min-h-[70vh]">
      Please log in to view routes.
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation Tabs */}
      <div className="flex mb-6 border-b">
        <Link href="/routes" className="px-4 py-2 border-b-2 border-blue-500 text-blue-500 font-semibold">
          Routes
        </Link>
        <Link href="/vehicles" className="px-4 py-2 hover:text-blue-500">
          Vehicle Inventory
        </Link>
        <Link href="/vehicles/scan" className="px-4 py-2 hover:text-blue-500">
          Scan QR Code
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Routes & Shipment Tracking</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Routes List */}
        <div className="lg:col-span-5">
          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Routes</h2>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Add New Route
              </button>
            </div>
            
            {isLoading ? (
              <p>Loading routes...</p>
            ) : routes.length > 0 ? (
              <div className="space-y-4">
                {routes.map((route) => (
                  <div 
                    key={route.id}
                    onClick={() => handleRouteSelect(route)}
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      selectedRoute?.id === route.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between">
                      <h3 className="font-medium">{route.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        route.status === 'active' ? 'bg-green-100 text-green-800' : 
                        route.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {route.status.charAt(0).toUpperCase() + route.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {route.origin} → {route.destination}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(route.startDate).toLocaleDateString()} - {new Date(route.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No routes found. Create a new route to get started.</p>
            )}
          </div>
        </div>
        
        {/* Map and Details */}
        <div className="lg:col-span-7">
          {/* Map */}
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Route Map</h2>
            <Map 
              waypoints={selectedRoute?.waypoints || []}
              selectedRouteId={selectedRoute?.id}
            />
          </div>
          
          {/* Route Details */}
          {selectedRoute && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-xl font-bold mb-4">Route Details: {selectedRoute.name}</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Origin</p>
                  <p className="font-medium">{selectedRoute.origin}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-medium">{selectedRoute.destination}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">{new Date(selectedRoute.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-medium">{new Date(selectedRoute.endDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-medium ${
                    selectedRoute.status === 'active' ? 'text-green-600' :
                    selectedRoute.status === 'completed' ? 'text-gray-600' :
                    'text-yellow-600'
                  }`}>
                    {selectedRoute.status.charAt(0).toUpperCase() + selectedRoute.status.slice(1)}
                  </p>
                </div>
              </div>
              
              {/* Waypoints */}
              <div>
                <h3 className="font-semibold mb-2">Waypoints</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  {selectedRoute.waypoints.map((waypoint, index) => (
                    <li key={index}>
                      {waypoint.name} 
                      <span className="text-sm text-gray-500 ml-2">
                        ({waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)})
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              
              <div className="mt-6 flex space-x-4">
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                  Update Route
                </button>
                <button className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded">
                  View Tracking History
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 border border-gray-200 rounded-md">
        <h3 className="font-medium text-gray-700 mb-2">Development Notes</h3>
        <p className="text-sm text-gray-600">
          This is using mock data for demonstration. In the production version, 
          this would connect to your real API endpoints for routes and tracking.
        </p>
      </div>
    </div>
  );
}
