'use client';

import { useState } from 'react';

export default function QrScanner({ onScan, onError, facingMode = 'environment' }) {
  const [manualCode, setManualCode] = useState('');

  // For MVP, we're using a simplified approach without actual QR scanning
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="qr-scanner-container p-4 border border-gray-300 rounded-lg bg-gray-50">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium mb-2">QR Scanner (MVP Mode)</h3>
        <p className="text-gray-500 text-sm">
          For the MVP, we're using manual entry instead of camera scanning.
        </p>
      </div>
      
      {/* Manual Code Entry */}
      <form onSubmit={handleManualSubmit} className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Enter QR/Barcode Value Manually
        </label>
        <div className="flex">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter code value"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Submit
          </button>
        </div>
      </form>
      
      {/* File Upload Simulation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload Image of QR Code (Simulation)
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600 justify-center">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
              >
                <span>Upload a file</span>
                <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file" 
                  className="sr-only" 
                  onChange={() => {
                    // Simulate a scan with a demo value
                    onScan("DEMO-QR-CODE-12345");
                  }} 
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG up to 5MB (Note: Actual file upload is simulated for MVP)
            </p>
          </div>
        </div>
      </div>
      
      {/* Mock Camera */}
      <div className="mt-6 border p-4 rounded bg-black text-center">
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-white">Camera access simulation for MVP</p>
        </div>
        <button
          onClick={() => onScan("CAMERA-SCAN-67890")}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Simulate Camera Scan
        </button>
      </div>
    </div>
  );
}
