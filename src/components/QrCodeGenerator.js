'use client';

export default function QrCodeGenerator({ value, size = 200 }) {
  // For MVP, we'll use a simple placeholder instead of an actual QR code
  const handleDownload = () => {
    // In a real implementation, we would generate and download an actual QR code
    alert('QR Code download functionality will be implemented in the production version.');
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg shadow">
        {/* Placeholder for QR code */}
        <div 
          style={{ 
            width: size, 
            height: size, 
            backgroundColor: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px dashed #d1d5db'
          }}
        >
          <div className="text-center p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2m0 0v2m0-6V4m6 6v2" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">QR Code Placeholder</p>
            <p className="mt-1 text-xs text-gray-400">Value: {value}</p>
          </div>
        </div>
      </div>
      <button
        onClick={handleDownload}
        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Download QR Code
      </button>
      <p className="text-xs text-gray-500 mt-2">
        (MVP Simulation - Actual generation in production)
      </p>
    </div>
  );
}
