'use client';

export default function ImportSummary({ results, onStartOver, onViewVehicles }) {
  // Default results if none provided
  const data = results || {
    success: true,
    imported: 0,
    failed: 0,
    errors: [],
    warnings: []
  };
  
  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const viewImportedVehicles = () => {
    window.location.href = '/vehicles?showImported=true';
  };
  
  return (
    <div className="p-4">
      <div className="text-center mb-8">
        {data.success ? (
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )}
        
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          {data.success 
            ? 'Import Completed Successfully' 
            : 'Import Completed with Issues'}
        </h2>
        
        <p className="mt-2 text-gray-600">
          {data.imported} vehicles were successfully imported
          {data.failed > 0 && `, ${data.failed} failed`}.
        </p>
        
        <p className="mt-1 text-sm text-gray-500">
          {formatDate(new Date())}
        </p>
      </div>
      
      {/* Import statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-500 mb-1">Successfully Imported</p>
          <p className="text-3xl font-bold text-green-600">{data.imported}</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-500 mb-1">Warnings</p>
          <p className="text-3xl font-bold text-yellow-600">{data.warnings?.length || 0}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-500 mb-1">Failed</p>
          <p className="text-3xl font-bold text-red-600">{data.failed}</p>
        </div>
      </div>
      
      {/* Errors section */}
      {data.errors && data.errors.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Errors</h3>
          <div className="bg-red-50 border border-red-200 rounded-md overflow-hidden">
            <ul className="divide-y divide-red-200">
              {data.errors.map((error, index) => (
                <li key={index} className="p-3 text-sm text-red-700">
                  <div className="font-medium">{error.row ? `Row ${error.row}:` : ''} {error.message}</div>
                  {error.details && (
                    <div className="mt-1 text-xs">{error.details}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Warnings section */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Warnings</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md overflow-hidden">
            <ul className="divide-y divide-yellow-200">
              {data.warnings.map((warning, index) => (
                <li key={index} className="p-3 text-sm text-yellow-700">
                  <div className="font-medium">{warning.row ? `Row ${warning.row}:` : ''} {warning.message}</div>
                  {warning.details && (
                    <div className="mt-1 text-xs">{warning.details}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      <div className="flex justify-center space-x-4 mt-6">
        <button
          type="button"
          onClick={onStartOver}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Import Another File
        </button>
        
        <button
          type="button"
          onClick={viewImportedVehicles}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          View Imported Vehicles
        </button>
      </div>
    </div>
  );
}
