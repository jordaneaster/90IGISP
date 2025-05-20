'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import apiService from '@/services/api';
import Modal from '@/components/Modal';

// Import Map component dynamically
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-[600px] bg-gray-200 flex items-center justify-center">Loading Map...</div>
});

export default function TrackingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [traccarDevices, setTraccarDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devicePositions, setDevicePositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New state for device creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', uniqueId: '' });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  
  useEffect(() => {
    if (user && !authLoading) {
      fetchTraccarDevices();
    }
  }, [user, authLoading]);
  
  useEffect(() => {
    if (selectedDevice) {
      fetchDevicePositions(selectedDevice.id);
    }
  }, [selectedDevice]);

  const fetchTraccarDevices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.getTraccarDevices();
      if (response.data.success) {
        setTraccarDevices(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching Traccar devices:', err);
      setError('Failed to load tracked devices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDevicePositions = async (deviceId) => {
    if (!deviceId) return;
    
    setIsLoading(true);
    try {
      const response = await apiService.getTraccarPositions(deviceId);
      if (response.data.success) {
        setDevicePositions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching device positions:', err);
      setError('Failed to load device positions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
  };
  
  // Handle device creation form inputs
  const handleDeviceInputChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new device
  const handleCreateDevice = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError('');
    setCreateSuccess(false);

    // Validate inputs
    if (!newDevice.name || !newDevice.uniqueId) {
      setCreateError('Name and VIN/Unique ID are required');
      setIsCreating(false);
      return;
    }

    try {
      const response = await apiService.createTraccarDevice(newDevice);
      
      if (response.data.success) {
        setCreateSuccess(true);
        setNewDevice({ name: '', uniqueId: '' });
        
        // Refresh device list
        setTimeout(() => {
          fetchTraccarDevices();
          setIsCreateModalOpen(false);
        }, 2000);
      } else {
        setCreateError(response.data.error || 'Failed to create device');
      }
    } catch (err) {
      console.error('Error creating device:', err);
      setCreateError(err.response?.data?.message || err.message || 'Failed to create device');
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[70vh]">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center min-h-[70vh]">
      Please log in to view tracking information.
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex mb-6 border-b">
        <Link href="/routes" className="px-4 py-2 hover:text-blue-500">
          Routes
        </Link>
        <Link href="/vehicles" className="px-4 py-2 hover:text-blue-500">
          Vehicle Inventory
        </Link>
        <Link href="/tracking" className="px-4 py-2 border-b-2 border-blue-500 text-blue-500 font-semibold">
          GPS Tracking
        </Link>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">GPS Vehicle Tracking</h1>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add GPS Device
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with devices list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-xl font-bold mb-4">Tracked Devices</h2>
            {isLoading && !traccarDevices.length ? (
              <p>Loading devices...</p>
            ) : traccarDevices.length > 0 ? (
              <div>
                <div className="mb-4">
                  <button 
                    onClick={fetchTraccarDevices}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
                  >
                    Refresh Devices
                  </button>
                </div>
                <ul className="space-y-2">
                  {traccarDevices.map(device => (
                    <li 
                      key={device.id}
                      onClick={() => handleDeviceSelect(device)}
                      className={`p-2 rounded cursor-pointer ${
                        selectedDevice?.id === device.id 
                          ? 'bg-blue-100 border border-blue-300' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-gray-500">ID: {device.id}</div>
                      <div className="text-xs mt-1">
                        {device.lastUpdate 
                          ? new Date(device.lastUpdate).toLocaleString() 
                          : 'No update time available'}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                <p className="mb-4">No tracked devices found.</p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                >
                  Add New Device
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Main content area */}
        <div className="lg:col-span-3">
          {/* Map section */}
          <div className="bg-white rounded shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Location Map</h2>
              {selectedDevice && (
                <button
                  onClick={() => fetchDevicePositions(selectedDevice.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
                >
                  Refresh Positions
                </button>
              )}
            </div>
            <div className="h-[500px]">
              <Map 
                traccarDevices={traccarDevices} 
                selectedDeviceId={selectedDevice?.id}
                onDeviceClick={handleDeviceSelect}
              />
            </div>
          </div>
          
          {/* Device details section */}
          {selectedDevice && (
            <div className="bg-white rounded shadow p-4">
              <h2 className="text-xl font-bold mb-4">Device Details: {selectedDevice.name}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Device ID</p>
                  <p className="font-medium">{selectedDevice.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{selectedDevice.status || 'Active'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Update</p>
                  <p className="font-medium">
                    {selectedDevice.lastUpdate 
                      ? new Date(selectedDevice.lastUpdate).toLocaleString() 
                      : 'Unknown'}
                  </p>
                </div>
              </div>
              
              {devicePositions.length > 0 && (
                <>
                  <h3 className="font-semibold text-lg mb-2">Position History</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Latitude</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Longitude</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Speed</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {devicePositions.map((position, index) => (
                          <tr key={`pos-${index}`}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {new Date(position.deviceTime || position.fixTime).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {position.latitude.toFixed(6)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {position.longitude.toFixed(6)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {position.speed ? `${position.speed} km/h` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {devicePositions.length === 0 && !isLoading && (
                <p>No position history available for this device.</p>
              )}
              
              {isLoading && (
                <p>Loading position history...</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Create Device Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New GPS Tracking Device"
        size="md"
      >
        <form onSubmit={handleCreateDevice}>
          {createError && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {createError}
            </div>
          )}
          
          {createSuccess && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Device created successfully!
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Device Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newDevice.name}
              onChange={handleDeviceInputChange}
              placeholder="e.g., Truck 101"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
            <p className="text-gray-500 text-xs mt-1">A recognizable name for this device</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="uniqueId">
              VIN/Unique ID *
            </label>
            <input
              type="text"
              id="uniqueId"
              name="uniqueId"
              value={newDevice.uniqueId}
              onChange={handleDeviceInputChange}
              placeholder="e.g., 1HGCM82633A123456"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
            <p className="text-gray-500 text-xs mt-1">Vehicle Identification Number or unique identifier</p>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center ${
                isCreating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : 'Create Device'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
