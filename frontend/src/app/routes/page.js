'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import apiService from '@/services/api';

// Import Map component dynamically to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-[600px] bg-gray-200 flex items-center justify-center">Loading Map...</div>
});

export default function RoutesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Convert selectedRoute to waypoints format for the Map component
  const waypoints = selectedRoute?.waypoints || [];

  // Fetch routes on component mount
  useEffect(() => {
    if (user && !authLoading) {
      fetchRoutes();
    }
  }, [user, authLoading]);

  const fetchRoutes = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getRoutes();
      if (response.data.success) {
        setRoutes(response.data.data);
        // Select first route by default if available
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
    // Could redirect to login here instead
    return <div className="flex justify-center items-center min-h-[70vh]">
      Please log in to view routes.
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Route Visualization</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Routes List */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Available Routes</h2>
            {isLoading ? (
              <p>Loading routes...</p>
            ) : routes.length > 0 ? (
              <ul className="space-y-2">
                {routes.map((route) => (
                  <li key={route.id}>
                    <button
                      onClick={() => handleRouteSelect(route)}
                      className={`w-full text-left px-4 py-2 rounded ${
                        selectedRoute?.id === route.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {route.name || `Route ${route.id}`}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No routes available.</p>
            )}
          </div>
        </div>
        
        {/* Map */}
        <div className="lg:col-span-3">
          <div className="bg-white p-4 rounded shadow">
            <Map waypoints={waypoints} />
          </div>
          
          {/* Route Details */}
          {selectedRoute && (
            <div className="bg-white p-4 rounded shadow mt-4">
              <h2 className="text-xl font-bold mb-2">{selectedRoute.name || `Route ${selectedRoute.id}`}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Origin</p>
                  <p>{selectedRoute.origin?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p>{selectedRoute.destination?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Distance</p>
                  <p>{selectedRoute.distance ? `${selectedRoute.distance} km` : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Time</p>
                  <p>{selectedRoute.duration ? `${selectedRoute.duration} min` : 'Unknown'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
