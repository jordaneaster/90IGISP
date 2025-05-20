'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import FileUploader from '@/components/onboarding/FileUploader';
import FieldMapper from '@/components/onboarding/FieldMapper';
import DataPreview from '@/components/onboarding/DataPreview';
import ImportSummary from '@/components/onboarding/ImportSummary';
import apiService from '@/services/api';

const STEPS = {
  UPLOAD: 'upload',
  MAPPING: 'mapping',
  PREVIEW: 'preview',
  IMPORT: 'import',
  SUMMARY: 'summary'
};

export default function OnboardingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [mappedData, setMappedData] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationIssues, setValidationIssues] = useState([]);

  // Handle file upload and parsing
  const handleFileUploaded = async (file, fileData) => {
    setUploadedFile(file);
    
    try {
      setIsLoading(true);
      // Send the file to be parsed
      const response = await apiService.parseFile(fileData);
      
      if (response.data.success) {
        setParsedData(response.data.data);
        // Auto-suggest field mappings based on common field names
        setFieldMapping(response.data.suggestedMapping || {});
        setCurrentStep(STEPS.MAPPING);
      } else {
        setError(response.data.error || 'Failed to parse file');
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Failed to parse the uploaded file. Please check the format and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle field mapping updates
  const handleMappingComplete = (mapping, correctedData = null) => {
    setFieldMapping(mapping);
    
    // Apply the mapping to create transformed data
    const dataToMap = correctedData || parsedData;
    const transformed = dataToMap.map(item => {
      const mappedItem = {};
      Object.entries(mapping).forEach(([targetField, sourceField]) => {
        if (sourceField && sourceField !== 'ignore') {
          mappedItem[targetField] = item[sourceField];
        }
      });
      return mappedItem;
    });
    
    // Validate the transformed data
    const issues = validateData(transformed);
    setValidationIssues(issues);
    
    setMappedData(transformed);
    setCurrentStep(STEPS.PREVIEW);
  };

  // Validate data before import
  const validateData = (data) => {
    const issues = [];
    
    data.forEach((item, index) => {
      // Check VIN - For demo purposes, we'll be more lenient
      // Real VINs are 17 characters but we'll accept shorter ones for demo
      if (!item.vin) {
        issues.push({
          row: index,
          severity: 'error',
          field: 'vin',
          message: 'Missing VIN'
        });
      } else if (item.vin.length < 5) { // Much more lenient for demo
        issues.push({
          row: index,
          severity: 'warning', // Downgraded from error to warning
          field: 'vin',
          message: 'VIN is shorter than recommended length'
        });
      }
      
      // Check make - should not be empty
      if (!item.make || item.make.trim() === '') {
        issues.push({
          row: index,
          severity: 'error',
          field: 'make',
          message: 'Make is required'
        });
      }
      
      // Check model - should not be empty
      if (!item.model || item.model.trim() === '') {
        issues.push({
          row: index,
          severity: 'error',
          field: 'model',
          message: 'Model is required'
        });
      }
      
      // Check year - should be a valid year
      if (!item.year) {
        issues.push({
          row: index,
          severity: 'error',
          field: 'year',
          message: 'Year is required'
        });
      } else if (isNaN(item.year) || Number(item.year) < 1900 || Number(item.year) > new Date().getFullYear() + 1) {
        issues.push({
          row: index,
          severity: 'warning',
          field: 'year',
          message: 'Year appears to be invalid'
        });
      }
      
      // Check status - should be one of the valid statuses
      if (item.status && !['available', 'leased', 'service', 'sold'].includes(item.status.toLowerCase())) {
        issues.push({
          row: index,
          severity: 'warning',
          field: 'status',
          message: 'Status should be: available, leased, service, or sold'
        });
      }
      
      // Check location - warning if missing
      if (!item.location || item.location.trim() === '') {
        issues.push({
          row: index,
          severity: 'warning',
          field: 'location',
          message: 'Location is recommended but not required'
        });
      }
    });
    
    return issues;
  };

  // Handle data confirmation and start import
  const handleConfirmImport = async (selectedData) => {
    try {
      setIsLoading(true);
      setCurrentStep(STEPS.IMPORT);
      
      // Filter out any data with critical validation errors
      const dataToImport = selectedData.filter((item, index) => {
        const rowIssues = validationIssues.filter(
          issue => issue.row === index && issue.severity === 'error'
        );
        return rowIssues.length === 0; // Only include rows without errors
      });
      
      // Send the mapped data to be imported
      const response = await apiService.importVehicles(dataToImport);
      
      if (response.data.success) {
        setImportResults(response.data);
        setCurrentStep(STEPS.SUMMARY);
      } else {
        setError(response.data.error || 'Failed to import data');
        setCurrentStep(STEPS.PREVIEW); // Go back to preview
      }
    } catch (err) {
      console.error('Error importing data:', err);
      setError('Failed to import the data. Please try again.');
      setCurrentStep(STEPS.PREVIEW); // Go back to preview
    } finally {
      setIsLoading(false);
    }
  };

  // Start over the import process
  const handleStartOver = () => {
    setUploadedFile(null);
    setParsedData(null);
    setFieldMapping({});
    setMappedData(null);
    setImportResults(null);
    setError('');
    setValidationIssues([]);
    setCurrentStep(STEPS.UPLOAD);
  };

  // Show loading state when authenticating
  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[70vh]">Loading...</div>;
  }

  // Require login
  if (!user) {
    return <div className="flex justify-center items-center min-h-[70vh]">
      Please log in to access the onboarding tools.
    </div>;
  }

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
        <Link href="/onboarding" className="px-4 py-2 border-b-2 border-blue-500 text-blue-500 font-semibold">
          Onboarding
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Customer Onboarding</h1>

      {/* Step indicators */}
      <div className="mb-8">
        <ol className="flex items-center w-full">
          {Object.entries(STEPS).map(([key, value], index) => (
            <li key={key} className={`flex items-center ${index !== 0 ? 'w-full' : ''}`}>
              <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${currentStep === value ? 'border-blue-600 bg-blue-100' : 
                  Object.values(STEPS).indexOf(currentStep) > index ? 'border-green-600 bg-green-100' : 
                  'border-gray-300 bg-gray-100'}`}>
                {Object.values(STEPS).indexOf(currentStep) > index ? (
                  <svg className="w-3.5 h-3.5 text-green-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5.917 5.724 10.5 15 1.5"/>
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className={`ml-2 text-sm font-medium ${currentStep === value ? 'text-blue-600' : 'text-gray-500'}`}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </span>
              {index < Object.entries(STEPS).length - 1 && (
                <div className="flex-1 ml-2 mr-2">
                  <div className={`h-0.5 ${Object.values(STEPS).indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Current step content */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {currentStep === STEPS.UPLOAD && (
          <FileUploader onFileUploaded={handleFileUploaded} isLoading={isLoading} />
        )}
        
        {currentStep === STEPS.MAPPING && (
          <FieldMapper 
            parsedData={parsedData} 
            initialMapping={fieldMapping}
            onMappingComplete={handleMappingComplete}
            onBack={handleStartOver}
            isLoading={isLoading}
          />
        )}
        
        {currentStep === STEPS.PREVIEW && (
          <DataPreview 
            data={mappedData} 
            onConfirm={handleConfirmImport} 
            onBack={() => setCurrentStep(STEPS.MAPPING)}
            isLoading={isLoading}
            validationIssues={validationIssues}
          />
        )}
        
        {currentStep === STEPS.IMPORT && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Importing Your Data</h2>
            <p className="text-gray-600">Please wait while we process and import your vehicle data...</p>
          </div>
        )}
        
        {currentStep === STEPS.SUMMARY && (
          <ImportSummary 
            results={importResults} 
            onStartOver={handleStartOver} 
            onViewVehicles={() => window.location.href = '/vehicles?showImported=true'}
          />
        )}
      </div>
    </div>
  );
}
