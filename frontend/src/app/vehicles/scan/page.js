'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import apiService from '@/services/api';
import dynamic from 'next/dynamic';
import Modal from '@/components/Modal';

// Import QR scanner component dynamically to avoid SSR issues
const QrScanner = dynamic(() => import('@/components/QrScanner'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-gray-200 flex items-center justify-center">Loading scanner...</div>
});

export default function ScanQRCodePage() {
  const { user } = useAuth();
  const [scannedVehicle, setScannedVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualVin, setManualVin] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [traccarDevice, setTraccarDevice] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', uniqueId: '' });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleScan = async (data) => {
    if (data) {
      // Avoid duplicate scans for the same code
      if (data === lastScannedCode) {
        return;
      }
      
      setLastScannedCode(data);
      fetchVehicleByCode(data);
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError('Error accessing scanner. Please check permissions or try the manual entry.');
  };

  const fetchVehicleByCode = async (code) => {
    setIsLoading(true);
    setError('');
    
    try {
      // For MVP, use mock data instead of actual API call
      setTimeout(() => {
        setScannedVehicle({
          id: '12345',
          year: '2022',
          make: 'Ford',
          model: 'F-150',
          vin: code.startsWith('VIN-') ? code : `VIN-${code}`,
          status: 'available',
          location: 'Main Lot',
          location_lat: 37.7749,
          location_lng: -122.4194,
          lastMovement: {
            by: 'John Doe',
            date: new Date().toISOString()
          }
        });
        setIsLoading(false);
      }, 1000);
      
      // Uncomment when API is ready:
      // const response = await apiService.getVehicleByCode(code);
      // if (response.data.success) {
      //   setScannedVehicle(response.data.data);
      // } else {
      //   setError('Vehicle not found. Please try again or use manual entry.');
      // }
    } catch (err) {
      console.error('Error fetching vehicle:', err);
      setError('Failed to load vehicle information. Please try again.');
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualVin.trim()) {
      fetchVehicleByCode(manualVin.trim());
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!scannedVehicle) return;
    
    setIsLoading(true);
    
    // For MVP, use mock update instead of actual API call
    setTimeout(() => {
      setScannedVehicle({
        ...scannedVehicle,
        status: status,
        lastMovement: {
          by: user?.name || user?.email || 'Admin User',
          date: new Date().toISOString()
        }
      });
      setIsLoading(false);
    }, 500);
    
    // Uncomment when API is ready:
    // try {
    //   const response = await apiService.updateVehicleStatus(scannedVehicle.id, status);
    //   if (response.data.success) {
    //     setScannedVehicle({
    //       ...scannedVehicle,
    //       status: status,
    //       lastMovement: {
    //         by: user?.name || user?.email,
    //         date: new Date().toISOString()
    //       }
    //     });
    //   }
    // } catch (err) {
    //   console.error('Error updating vehicle status:', err);
    //   setError('Failed to update vehicle status. Please try again.');
    // } finally {
    //   setIsLoading(false);
    // }
  };

  const handleUpdateLocation = async (location) => {
    if (!scannedVehicle) return;
    
    setIsLoading(true);
    
    // For MVP, use mock update instead of actual API call
    setTimeout(() => {
      setScannedVehicle({
        ...scannedVehicle,
        location: location,
        lastMovement: {
          by: user?.name || user?.email || 'Admin User',
          date: new Date().toISOString()
        }
      });
      setIsLoading(false);
    }, 500);
    
    // Uncomment when API is ready:
    // try {
    //   const response = await apiService.updateVehicleLocation(scannedVehicle.id, location);
    //   if (response.data.success) {
    //     setScannedVehicle({
    //       ...scannedVehicle,
    //       location: location,
    //       lastMovement: {
    //         by: user?.name || user?.email,
    //         date: new Date().toISOString()
    //       }
    //     });
    //   }
    // } catch (err) {
    //   console.error('Error updating vehicle location:', err);
    //   setError('Failed to update vehicle location. Please try again.');
    // } finally {
    //   setIsLoading(false);
    // }
  };

  // Check if vehicle is linked to Traccar
  useEffect(() => {
    if (scannedVehicle?.vin) {
      checkTraccarDevice(scannedVehicle.vin);
    }
  }, [scannedVehicle]);

  const checkTraccarDevice = async (vin) => {
    setIsChecking(true);
    setTraccarDevice(null);
    
    try {
      const response = await apiService.getDeviceByVin(vin);
      if (response.data.success) {
        setTraccarDevice(response.data.data);
      } 
      // If not found, traccarDevice will be null
    } catch (err) {
      console.error('Error checking Traccar device:', err);
      // Not finding a device is expected, so no error displayed
    } finally {
      setIsChecking(false);
    }
  };

  // Handle device creation form inputs
  const handleDeviceInputChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new device for scanned vehicle
  const handleCreateDevice = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError('');
    setCreateSuccess(false);

    // Default to scanned vehicle data if not manually entered
    const deviceName = newDevice.name || `Vehicle ${scannedVehicle?.vin}`;
    const deviceVin = newDevice.uniqueId || scannedVehicle?.vin;

    if (!deviceVin) {
      setCreateError('VIN/Unique ID is required');
      setIsCreating(false);
      return;
    }

    try {
      const response = await apiService.createTraccarDevice({
        name: deviceName,
        uniqueId: deviceVin
      });
      
      if (response.data.success) {
        setCreateSuccess(true);
        setTraccarDevice(response.data.data);
        
        // Close modal after success
        setTimeout(() => {
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation Tabs */}
      <div className="flex mb-6 border-b">
        <Link href="/routes" className="px-4 py-2 hover:text-blue-500">
          Routes
        </Link>
        <Link href="/vehicles" className="px-4 py-2 hover:text-blue-500">
          Vehicle Inventory
        </Link>
        <Link href="/vehicles/scan" className="px-4 py-2 border-b-2 border-blue-500 text-blue-500 font-semibold">
          Scan QR Code
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Scan Vehicle QR Code</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Scanner */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Scan QR Code</h2>
          <QrScanner 
            onScan={handleScan}
            onError={handleError}
            facingMode="environment"  // Use the back camera on mobile devices
          />
          
          {/* Manual Entry Form */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Or Enter VIN / Code Manually</h3>
            <form onSubmit={handleManualSubmit} className="flex">
              <input
                type="text"
                placeholder="Enter VIN or QR code data"
                value={manualVin}
                onChange={(e) => setManualVin(e.target.value)}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button 
                type="submit" 
                className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Search
              </button>
            </form>
          </div>
        </div>
        
        {/* Vehicle Details */}
        <div>
          {isLoading ? (
            <div className="bg-white p-4 rounded shadow">
              <p>Loading vehicle information...</p>
            </div>
          ) : scannedVehicle ? (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-xl font-bold mb-4">Vehicle Information</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Make & Model</p>
                  <p className="font-medium">{scannedVehicle.year} {scannedVehicle.make} {scannedVehicle.model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">VIN</p>
                  <p className="font-medium">{scannedVehicle.vin}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Status</p>
                  <p className={`font-medium ${
                    scannedVehicle.status === 'available' ? 'text-green-600' :
                    scannedVehicle.status === 'leased' ? 'text-blue-600' :
                    scannedVehicle.status === 'service' ? 'text-yellow-600' :
                    scannedVehicle.status === 'sold' ? 'text-purple-600' : ''
                  }`}>
                    {scannedVehicle.status.charAt(0).toUpperCase() + scannedVehicle.status.slice(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Location</p>
                  <p className="font-medium">{scannedVehicle.location}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Last Movement</p>
                  <p className="font-medium">
                    {scannedVehicle.lastMovement?.by || 'N/A'} on {scannedVehicle.lastMovement ? formatDate(scannedVehicle.lastMovement.date) : 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Update Status */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleUpdateStatus('available')} 
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full hover:bg-green-200"
                  >
                    Available
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('leased')} 
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                  >
                    Leased
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('service')} 
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200"
                  >
                    In Service
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('sold')} 
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200"
                  >
                    Sold
                  </button>
                </div>
              </div>
              
              {/* Update Location */}
              <div>
                <h3 className="font-semibold mb-2">Update Location</h3>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleUpdateLocation('Main Lot')} 
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
                  >
                    Main Lot
                  </button>
                  <button 
                    onClick={() => handleUpdateLocation('Overflow Lot')} 
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
                  >
                    Overflow Lot
                  </button>
                  <button 
                    onClick={() => handleUpdateLocation('Service Center')} 
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
                  >
                    Service Center
                  </button>
                  <button 
                    onClick={() => handleUpdateLocation('Offsite')} 
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
                  >
                    Offsite
                  </button>
                </div>
              </div>
              
              {/* GPS Tracking Section */}
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-2">GPS Tracking</h3>
                {isChecking ? (
                  <p>Checking if this vehicle is GPS-tracked...</p>
                ) : traccarDevice ? (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="text-green-700 mb-1">✓ This vehicle is GPS-tracked</p>
                    <p className="text-sm">Device ID: {traccarDevice.id}</p>
                    <p className="text-sm">Name: {traccarDevice.name}</p>
                    <button 
                      className="mt-2 text-blue-500 hover:underline text-sm"
                      onClick={() => window.open('/tracking', '_blank')}
                    >
                      View in GPS Tracker
                    </button>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <p className="text-yellow-700 mb-1">This vehicle is not GPS-tracked</p>
                    <button 
                      onClick={() => {
                        setNewDevice({ 
                          name: `${scannedVehicle.year} ${scannedVehicle.make} ${scannedVehicle.model}`, 
                          uniqueId: scannedVehicle.vin 
                        });
                        setIsCreateModalOpen(true);
                      }}
                      className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add to GPS Tracker
                    </button>
                  </div>
                )}
              </div>
              
              {/* View Full Details Link */}
              <div className="mt-6">
                <Link href={`/vehicles/${scannedVehicle.id}`} className="text-blue-500 hover:underline">
                  View Complete Vehicle History
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-xl font-bold mb-4">No Vehicle Scanned</h2>
              <p>Scan a QR code or enter a VIN to view vehicle details.</p>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>MVP Note:</strong> For testing, try using the "Simulate Camera Scan" button or enter any text in the manual field.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Device Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Vehicle to GPS Tracker"
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
              Vehicle added to GPS tracker successfully!
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Device Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newDevice.name}
              onChange={handleDeviceInputChange}
              placeholder={`${scannedVehicle?.year} ${scannedVehicle?.make} ${scannedVehicle?.model}`}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-gray-500 text-xs mt-1">A recognizable name for this device (defaults to vehicle info)</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="uniqueId">
              VIN/Unique ID
            </label>
            <input
              type="text"
              id="uniqueId"
              name="uniqueId"
              value={newDevice.uniqueId}
              onChange={handleDeviceInputChange}
              placeholder={scannedVehicle?.vin}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              readOnly={!!scannedVehicle?.vin}
            />
            <p className="text-gray-500 text-xs mt-1">Vehicle Identification Number (pre-filled from scan)</p>
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
                  Adding...
                </>
              ) : 'Add to GPS Tracker'}
            </button>
          </div>
        </form>
      </Modal>
      
      <div className="mt-8 p-4 bg-gray-100 border border-gray-200 rounded-md">
        <h3 className="font-medium text-gray-700 mb-2">MVP Development Notes</h3>
        <p className="text-sm text-gray-600">
          This is a simplified version of the QR scanner for MVP purposes. In the production version, 
          we would integrate with a real camera-based QR code scanner and connect to the backend API.
          You can now link scanned vehicles to the Traccar GPS tracking system.
        </p>
      </div>
    </div>
  );
}
