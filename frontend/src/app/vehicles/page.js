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
  loading: () => <div className="h-[400px] bg-gray-200 flex items-center justify-center">Loading Map...</div>
});

export default function VehicleInventoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [traccarDevices, setTraccarDevices] = useState([]);
  const [importedVehicles, setImportedVehicles] = useState([]);
  const [showingImported, setShowingImported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTraccar, setIsLoadingTraccar] = useState(false);
  const [error, setError] = useState('');
  const [traccarError, setTraccarError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [viewMode, setViewMode] = useState('vehicles'); // 'vehicles' or 'traccar'
  
  // Status counts for dashboard metrics
  const [metrics, setMetrics] = useState({
    available: 0,
    leased: 0,
    service: 0,
    sold: 0,
    total: 0
  });

  // New state for device creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', uniqueId: '' });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      fetchVehicles();
      fetchImportedVehicles();
      fetchTraccarDevices();
      
      // Check if we should show imported vehicles tab
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('showImported') === 'true') {
        setShowingImported(true);
      }
    }
  }, [user, authLoading]);

  // Add function to fetch imported vehicles
  const fetchImportedVehicles = async () => {
    try {
      const response = await apiService.getImportedVehicles();
      if (response.data.success) {
        setImportedVehicles(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching imported vehicles:', err);
    }
  };

  // Apply filters whenever search term or filters change
  useEffect(() => {
    if (vehicles.length > 0 || importedVehicles.length > 0) {
      applyFilters();
    }
  }, [searchTerm, statusFilter, locationFilter, vehicles, importedVehicles, showingImported]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.getVehicles();
      if (response.data.success) {
        setVehicles(response.data.data);
        calculateMetrics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTraccarDevices = async () => {
    setIsLoadingTraccar(true);
    setTraccarError('');
    try {
      const response = await apiService.getTraccarDevices();
      if (response.data.success) {
        setTraccarDevices(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching Traccar devices:', err);
      setTraccarError('Failed to load Traccar devices. Please try again.');
    } finally {
      setIsLoadingTraccar(false);
    }
  };

  const fetchDevicePositions = async (deviceId) => {
    if (!deviceId) return;
    
    try {
      const response = await apiService.getTraccarPositions(deviceId);
      if (response.data.success) {
        // Update the selected device with position data
        setSelectedDevice(prev => ({
          ...prev,
          positions: response.data.data
        }));
      }
    } catch (err) {
      console.error('Error fetching device positions:', err);
    }
  };

  const calculateMetrics = (vehicleData) => {
    const counts = {
      available: 0,
      leased: 0,
      service: 0,
      sold: 0,
      total: vehicleData.length
    };

    vehicleData.forEach(vehicle => {
      if (vehicle.status in counts) {
        counts[vehicle.status]++;
      }
    });

    setMetrics(counts);
  };

  const applyFilters = () => {
    // Determine which vehicle source to use
    const sourceVehicles = showingImported ? importedVehicles : vehicles;
    let filtered = [...sourceVehicles];

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(vehicle => 
        vehicle.vin.toLowerCase().includes(term) ||
        vehicle.make.toLowerCase().includes(term) ||
        vehicle.model.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === statusFilter);
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.location === locationFilter);
    }

    setFilteredVehicles(filtered);
  };

  // Calculate metrics for both imported and regular vehicles
  useEffect(() => {
    if (showingImported) {
      calculateMetrics(importedVehicles);
    } else {
      calculateMetrics(vehicles);
    }
  }, [vehicles, importedVehicles, showingImported]);

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedDevice(null); // Clear selected device when selecting a vehicle
  };

  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
    setSelectedVehicle(null); // Clear selected vehicle when selecting a device
    fetchDevicePositions(device.id);
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

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[70vh]">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center min-h-[70vh]">
      Please log in to view vehicle inventory.
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation Tabs */}
      <div className="flex mb-6 border-b">
        <Link href="/routes" className="px-4 py-2 hover:text-blue-500">
          Routes
        </Link>
        <Link href="/vehicles" className="px-4 py-2 border-b-2 border-blue-500 text-blue-500 font-semibold">
          Vehicle Inventory
        </Link>
        <Link href="/vehicles/scan" className="px-4 py-2 hover:text-blue-500">
          Scan QR Code
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Vehicle Inventory Dashboard</h1>
      
      {/* View Mode Toggle */}
      <div className="mb-6">
        <div className="inline-flex rounded-md shadow-sm mr-4" role="group">
          <button
            type="button"
            onClick={() => setViewMode('vehicles')}
            className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${
              viewMode === 'vehicles' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Local Inventory
          </button>
          <button
            type="button"
            onClick={() => setViewMode('traccar')}
            className={`px-4 py-2 text-sm font-medium border rounded-r-lg ${
              viewMode === 'traccar' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            GPS Tracked Vehicles
          </button>
        </div>

        {viewMode === 'vehicles' && (
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setShowingImported(false)}
              className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${
                !showingImported 
                  ? 'bg-green-500 text-white border-green-500' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Sample Data
            </button>
            <button
              type="button"
              onClick={() => setShowingImported(true)}
              className={`px-4 py-2 text-sm font-medium border rounded-r-lg ${
                showingImported 
                  ? 'bg-green-500 text-white border-green-500' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Imported Vehicles ({importedVehicles.length})
            </button>
          </div>
        )}
      </div>
      
      {error && viewMode === 'vehicles' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {traccarError && viewMode === 'traccar' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {traccarError}
        </div>
      )}
      
      {viewMode === 'vehicles' ? (
        <>
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow text-center">
              <h3 className="text-gray-500 text-sm">Total Vehicles</h3>
              <p className="text-2xl font-bold">{metrics.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded shadow text-center">
              <h3 className="text-gray-500 text-sm">Available</h3>
              <p className="text-2xl font-bold text-green-600">{metrics.available}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded shadow text-center">
              <h3 className="text-gray-500 text-sm">Leased</h3>
              <p className="text-2xl font-bold text-blue-600">{metrics.leased}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded shadow text-center">
              <h3 className="text-gray-500 text-sm">In Service</h3>
              <p className="text-2xl font-bold text-yellow-600">{metrics.service}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded shadow text-center">
              <h3 className="text-gray-500 text-sm">Sold</h3>
              <p className="text-2xl font-bold text-purple-600">{metrics.sold}</p>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by VIN, make, model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="leased">Leased</option>
                  <option value="service">In Service</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Locations</option>
                  <option value="Main Lot">Main Lot</option>
                  <option value="Overflow Lot">Overflow Lot</option>
                  <option value="Service Center">Service Center</option>
                  <option value="Downtown Showroom">Downtown Showroom</option>
                  <option value="Offsite">Offsite</option>
                </select>
              </div>
            </div>
          </div>

          {/* Add an info banner if showing imported vehicles */}
          {showingImported && importedVehicles.length > 0 && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
              Showing {importedVehicles.length} vehicles from your last import. 
              <button 
                className="ml-2 text-blue-500 underline"
                onClick={() => window.location.href = '/onboarding'} 
              >
                Import more vehicles
              </button>
            </div>
          )}
          
          {showingImported && importedVehicles.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
              You haven't imported any vehicles yet.
              <button 
                className="ml-2 text-blue-500 underline"
                onClick={() => window.location.href = '/onboarding'} 
              >
                Go to vehicle onboarding
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Vehicles List */}
            <div className="lg:col-span-7">
              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-4">Vehicles</h2>
                {isLoading ? (
                  <p>Loading vehicles...</p>
                ) : filteredVehicles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vehicle
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            VIN
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredVehicles.map((vehicle) => (
                          <tr 
                            key={vehicle.id} 
                            onClick={() => handleVehicleSelect(vehicle)}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              selectedVehicle?.id === vehicle.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              <div className="text-sm text-gray-500">
                                {vehicle.color}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{vehicle.vin}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${vehicle.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                                ${vehicle.status === 'leased' ? 'bg-blue-100 text-blue-800' : ''}
                                ${vehicle.status === 'service' ? 'bg-yellow-100 text-yellow-800' : ''}
                                ${vehicle.status === 'sold' ? 'bg-purple-100 text-purple-800' : ''}
                              `}>
                                {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {vehicle.location}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No vehicles found matching your criteria.</p>
                )}
              </div>
            </div>
            
            {/* Map and Vehicle Details */}
            <div className="lg:col-span-5">
              {/* Map showing vehicle locations */}
              <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="text-xl font-bold mb-4">Vehicle Locations</h2>
                <Map 
                  vehicles={filteredVehicles} 
                  selectedVehicleId={selectedVehicle?.id}
                  onMarkerClick={handleVehicleSelect}
                />
              </div>
              
              {/* Selected Vehicle Details */}
              {selectedVehicle && (
                <div className="bg-white p-4 rounded shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Vehicle Details</h2>
                    <Link href={`/vehicles/${selectedVehicle.id}`} className="text-blue-500 hover:underline">View Full Details</Link>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Make & Model</p>
                      <p className="font-medium">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">VIN</p>
                      <p className="font-medium">{selectedVehicle.vin}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">{selectedVehicle.status.charAt(0).toUpperCase() + selectedVehicle.status.slice(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{selectedVehicle.location}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Last Movement</p>
                      <p className="font-medium">{selectedVehicle.lastMovement?.by || 'N/A'} on {selectedVehicle.lastMovement ? formatDate(selectedVehicle.lastMovement.date) : 'N/A'}</p>
                    </div>
                    
                    <div className="col-span-2 mt-4 flex">
                      <Link href={`/vehicles/scan`} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2">
                        Update Status/Location
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Traccar Devices View */}
          <div className="bg-white p-4 rounded shadow mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">GPS Tracked Vehicles</h2>
                <p className="mb-4">View real-time locations of your GPS-tracked fleet using Traccar integration.</p>
              </div>
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
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Traccar Devices List */}
            <div className="lg:col-span-7">
              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-4">Tracked Devices</h2>
                {isLoadingTraccar ? (
                  <p>Loading tracked devices...</p>
                ) : traccarDevices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Update
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {traccarDevices.map((device) => (
                          <tr 
                            key={device.id} 
                            onClick={() => handleDeviceSelect(device)}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              selectedDevice?.id === device.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {device.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{device.id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {device.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {device.lastUpdate ? new Date(device.lastUpdate).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No tracked devices found.</p>
                )}
              </div>
            </div>
            
            {/* Map and Device Details */}
            <div className="lg:col-span-5">
              {/* Map showing device locations */}
              <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="text-xl font-bold mb-4">Device Locations</h2>
                <Map 
                  traccarDevices={traccarDevices} 
                  selectedDeviceId={selectedDevice?.id}
                  onDeviceClick={handleDeviceSelect}
                />
              </div>
              
              {/* Selected Device Details */}
              {selectedDevice && (
                <div className="bg-white p-4 rounded shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Device Details</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{selectedDevice.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ID</p>
                      <p className="font-medium">{selectedDevice.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">{selectedDevice.status || 'Active'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Update</p>
                      <p className="font-medium">
                        {selectedDevice.lastUpdate ? new Date(selectedDevice.lastUpdate).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    
                    {selectedDevice.positions && selectedDevice.positions.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Last Position</p>
                        <p className="font-medium">
                          Lat: {selectedDevice.positions[0].latitude.toFixed(6)}, 
                          Lng: {selectedDevice.positions[0].longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-4">
                      <button
                        onClick={() => fetchDevicePositions(selectedDevice.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                      >
                        Refresh Position Data
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
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
      
      <div className="mt-8 p-4 bg-gray-100 border border-gray-200 rounded-md">
        <h3 className="font-medium text-gray-700 mb-2">Integration Notes</h3>
        <p className="text-sm text-gray-600">
          This view integrates with the Traccar API to show GPS-tracked vehicles in real-time. 
          Toggle between your local inventory and GPS-tracked vehicles using the buttons above.
          You can now add new GPS tracking devices directly from this interface.
        </p>
      </div>
    </div>
  );
}
