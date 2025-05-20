'use client';

import { useState, useRef } from 'react';
import { 
  FiUpload, 
  FiFile, 
  FiFileText, 
  FiDatabase,
  FiGrid
} from 'react-icons/fi';

export default function FileUploader({ onFileUploaded, isLoading }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileError, setFileError] = useState('');
  const inputRef = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleChange = (e) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Process the selected file
  const handleFile = (file) => {
    setFileError('');
    setFileName(file.name);
    
    // Validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (['csv', 'xls', 'xlsx', 'json', 'xml', 'txt'].includes(ext)) {
      setFileType(ext);
      
      // Read the file content
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          content: e.target.result,
          extension: ext
        };
        
        // Pass the file data to parent component
        onFileUploaded(file, fileData);
      };
      
      reader.onerror = () => {
        setFileError('Error reading file. Please try again.');
      };
      
      if (['csv', 'txt', 'json', 'xml'].includes(ext)) {
        reader.readAsText(file); // Read as text
      } else {
        reader.readAsArrayBuffer(file); // Read as binary for Excel
      }
    } else {
      setFileType('');
      setFileError(`Unsupported file type: .${ext}. Please upload a CSV, Excel, JSON, XML, or text file.`);
    }
  };

  // Simulate a scan for the demo
  const handleSimulateScan = () => {
    // Generate a mock CSV content with valid VINs
    const mockCsv = `VIN,Make,Model,Year,Color,Status,Location,Latitude,Longitude
1HGCM82633A123456,Honda,Accord,2022,Black,available,Main Lot,37.7749,-122.4194
5XYKT3A17CG222222,Kia,Sorento,2020,White,leased,Offsite,37.7833,-122.4167
WBAPM7339AE111111,BMW,535i,2021,Blue,service,Service Center,37.7694,-122.4862
1FT8W3BT2LEC33333,Ford,F-250,2023,Red,available,Main Lot,37.7731,-122.4187
JN8AS5MT4CW444444,Nissan,Rogue,2019,Silver,sold,Offsite,37.7865,-122.4321
3VWDX7AJ5BM012345,Volkswagen,Jetta,2021,Gray,available,Main Lot,37.7776,-122.4253
19UYA31581L000000,Acura,TL,2020,Black,available,Service Center,37.7852,-122.4431
WAUAF78E45A000000,Audi,A4,2022,Blue,leased,Overflow Lot,37.7912,-122.4018`;

    const mockFile = new File([mockCsv], "vehicle_inventory.csv", {
      type: "text/csv"
    });
    
    setFileName(mockFile.name);
    setFileType('csv');
    
    onFileUploaded(mockFile, {
      name: mockFile.name,
      type: mockFile.type,
      size: mockFile.size,
      content: mockCsv,
      extension: 'csv'
    });
  };

  // Trigger file input click
  const onButtonClick = () => {
    inputRef.current.click();
  };

  // Get file type icon
  const getFileIcon = () => {
    switch (fileType) {
      case 'csv':
        return <FiFileText className="w-16 h-16 text-green-500" />;
      case 'xls':
      case 'xlsx':
        return <FiGrid className="w-16 h-16 text-green-600" />;
      case 'json':
        return <FiDatabase className="w-16 h-16 text-yellow-500" />;
      case 'xml':
        return <FiFile className="w-16 h-16 text-blue-500" />;
      case 'txt':
        return <FiFileText className="w-16 h-16 text-gray-500" />;
      default:
        return <FiFile className="w-16 h-16 text-gray-400" />;
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Upload Your Vehicle Data</h2>
      
      <p className="mb-6 text-gray-600">
        Get started by uploading your vehicle inventory data. We support CSV, Excel, JSON, XML, and text file formats.
      </p>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          onChange={handleChange}
          accept=".csv,.xls,.xlsx,.json,.xml,.txt"
        />
        
        {fileName ? (
          <div className="flex flex-col items-center">
            {getFileIcon()}
            <p className="mt-2 font-medium">{fileName}</p>
            <p className="text-sm text-gray-500">File type: {fileType.toUpperCase()}</p>
            
            {isLoading ? (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Processing file...</p>
              </div>
            ) : (
              <button 
                type="button"
                onClick={onButtonClick}
                className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
              >
                Choose a different file
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FiUpload className="w-16 h-16 text-gray-400 mb-4" />
            <p className="mb-2 text-lg font-medium text-gray-900">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: CSV, Excel, JSON, XML, Text
            </p>
            <div className="mt-4 flex gap-2">
              <button 
                type="button"
                onClick={onButtonClick}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Browse Files'}
              </button>
              <button
                type="button"
                onClick={handleSimulateScan}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                disabled={isLoading}
              >
                Demo: Use Sample Data
              </button>
            </div>
          </div>
        )}
      </div>
      
      {fileError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {fileError}
        </div>
      )}
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Supported File Formats</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded p-4">
            <div className="flex items-center mb-2">
              <FiFileText className="text-green-500 mr-2" size={24} />
              <h4 className="font-medium">CSV Files</h4>
            </div>
            <p className="text-sm text-gray-600">
              Comma-separated values with column headers in the first row.
            </p>
          </div>
          
          <div className="border rounded p-4">
            <div className="flex items-center mb-2">
              <FiGrid className="text-green-600 mr-2" size={24} />
              <h4 className="font-medium">Excel Files</h4>
            </div>
            <p className="text-sm text-gray-600">
              XLS or XLSX formats with column headers in the first row.
            </p>
          </div>
          
          <div className="border rounded p-4">
            <div className="flex items-center mb-2">
              <FiDatabase className="text-yellow-500 mr-2" size={24} />
              <h4 className="font-medium">JSON Files</h4>
            </div>
            <p className="text-sm text-gray-600">
              Array of objects with consistent property names.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
