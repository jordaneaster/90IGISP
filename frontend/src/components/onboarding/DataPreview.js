'use client';

import { useState, useEffect } from 'react';

export default function DataPreview({ data = [], onConfirm, onBack, isLoading, validationIssues = [] }) {
  const [selectedRows, setSelectedRows] = useState(Array.from({ length: data.length }, (_, i) => i));
  const [selectAll, setSelectAll] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('data'); // 'data' or 'issues'
  
  // Count issues by severity
  const errorCount = validationIssues.filter(issue => issue.severity === 'error').length;
  const warningCount = validationIssues.filter(issue => issue.severity === 'warning').length;
  
  // Find unique affected rows with errors
  const rowsWithErrors = [...new Set(
    validationIssues
      .filter(issue => issue.severity === 'error')
      .map(issue => issue.row)
  )];
  
  // Auto-deselect rows with errors
  useEffect(() => {
    if (rowsWithErrors.length > 0) {
      // Check if we need to update - only filter out rows that are currently selected
      const newSelection = selectedRows.filter(rowIndex => !rowsWithErrors.includes(rowIndex));
      
      // Only update state if the selection would actually change
      if (newSelection.length !== selectedRows.length) {
        setSelectedRows(newSelection);
      }
      
      // Only update selectAll if it's currently true and we have errors
      if (selectAll && rowsWithErrors.length > 0) {
        setSelectAll(false);
      }
    }
  // Adding selectedRows and selectAll as dependencies, but NOT rowsWithErrors
  // as rowsWithErrors is derived from validationIssues which is a prop
  }, [validationIssues]);

  // Calculate total pages
  const totalPages = Math.ceil(data.length / rowsPerPage);
  
  // Get current page data
  const currentData = data.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  
  // Get all fields from data
  const fields = data.length > 0 ? Object.keys(data[0]) : [];
  
  // Handle checkbox change for all rows
  const handleSelectAllChange = () => {
    if (selectAll) {
      // Deselect all, except keep rows with errors deselected
      setSelectedRows([]);
    } else {
      // Select all, except keep rows with errors deselected
      setSelectedRows(Array.from({ length: data.length }, (_, i) => i)
        .filter(i => !rowsWithErrors.includes(i)));
    }
    setSelectAll(!selectAll);
  };
  
  // Handle individual row selection
  const handleRowSelect = (index) => {
    const actualIndex = (currentPage - 1) * rowsPerPage + index;
    
    // Don't allow selecting rows with errors
    if (rowsWithErrors.includes(actualIndex)) {
      return;
    }
    
    if (selectedRows.includes(actualIndex)) {
      setSelectedRows(selectedRows.filter(i => i !== actualIndex));
      setSelectAll(false);
    } else {
      setSelectedRows([...selectedRows, actualIndex]);
      
      // Check if all non-error rows are now selected
      const allSelectableRows = Array.from({ length: data.length }, (_, i) => i)
        .filter(i => !rowsWithErrors.includes(i));
        
      if (selectedRows.length + 1 === allSelectableRows.length) {
        setSelectAll(true);
      }
    }
  };
  
  // Get issues for a specific row
  const getIssuesForRow = (rowIndex) => {
    return validationIssues.filter(issue => issue.row === rowIndex);
  };
  
  // Check if a row has issues
  const rowHasIssues = (rowIndex) => {
    return getIssuesForRow(rowIndex).length > 0;
  };
  
  // Check if a row has errors (not just warnings)
  const rowHasErrors = (rowIndex) => {
    return getIssuesForRow(rowIndex).some(issue => issue.severity === 'error');
  };
  
  // Check if a specific field in a row has issues
  const fieldHasIssues = (rowIndex, fieldName) => {
    return validationIssues.some(issue => 
      issue.row === rowIndex && issue.field === fieldName
    );
  };
  
  // Get issue severity for a field
  const getFieldIssueSeverity = (rowIndex, fieldName) => {
    const issue = validationIssues.find(issue => 
      issue.row === rowIndex && issue.field === fieldName
    );
    return issue ? issue.severity : null;
  };
  
  // Handle confirmation with selected rows only
  const handleConfirm = () => {
    const selectedData = selectedRows.map(index => data[index]);
    onConfirm(selectedData);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Preview and Confirm Import</h2>
      
      <p className="mb-6 text-gray-600">
        Review the data before importing. Select the rows you want to import or deselect any rows with errors.
      </p>
      
      {/* Validation summary */}
      {(errorCount > 0 || warningCount > 0) && (
        <div className={`p-4 mb-6 rounded-md border ${
          errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">
              {errorCount > 0 
                ? `${errorCount} validation errors found` 
                : `${warningCount} warnings found`}
            </h3>
            
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('data')}
                className={`px-3 py-1 text-sm rounded ${
                  activeTab === 'data'
                    ? 'bg-gray-200 font-medium'
                    : 'hover:bg-gray-100'
                }`}
              >
                Data
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`px-3 py-1 text-sm rounded ${
                  activeTab === 'issues'
                    ? 'bg-gray-200 font-medium'
                    : 'hover:bg-gray-100'
                }`}
              >
                Issues
              </button>
            </div>
          </div>
          
          {errorCount > 0 ? (
            <p className="text-red-700 text-sm">
              {rowsWithErrors.length} rows have validation errors and can't be imported. These rows are automatically deselected.
            </p>
          ) : (
            <p className="text-yellow-700 text-sm">
              {warningCount} non-critical issues were found. You can still import these rows.
            </p>
          )}
        </div>
      )}
      
      {activeTab === 'issues' && validationIssues.length > 0 ? (
        <div className="mb-6">
          <div className="bg-white border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Row
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {validationIssues.map((issue, idx) => (
                  <tr key={idx} className={issue.severity === 'error' ? 'bg-red-50' : 'bg-yellow-50'}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      {issue.row + 1}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      {issue.field}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {issue.message}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        issue.severity === 'error' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {issue.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button
            onClick={() => setActiveTab('data')}
            className="mt-4 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Back to Data Preview
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={selectAll}
                  onChange={handleSelectAllChange}
                  id="select-all"
                />
                <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                  Select all valid rows
                </label>
              </div>
              
              <div className="text-sm text-gray-500">
                {selectedRows.length} of {data.length} rows selected
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto mb-6 border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  {fields.map(field => (
                    <th 
                      key={field} 
                      scope="col" 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.map((row, index) => {
                  const actualIndex = (currentPage - 1) * rowsPerPage + index;
                  const hasIssues = rowHasIssues(actualIndex);
                  const hasErrors = rowHasErrors(actualIndex);
                  
                  return (
                    <tr 
                      key={index} 
                      className={`
                        ${hasErrors ? 'bg-red-50' : hasIssues ? 'bg-yellow-50' : ''} 
                        ${selectedRows.includes(actualIndex) ? 'bg-blue-50' : ''}
                        ${hasErrors ? 'cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                            hasErrors ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          checked={selectedRows.includes(actualIndex)}
                          onChange={() => handleRowSelect(index)}
                          disabled={hasErrors}
                        />
                      </td>
                      {fields.map(field => {
                        const fieldHasIssue = fieldHasIssues(actualIndex, field);
                        const issueSeverity = getFieldIssueSeverity(actualIndex, field);
                        
                        return (
                          <td 
                            key={field} 
                            className={`px-3 py-2 whitespace-nowrap text-sm text-gray-500 truncate max-w-[10rem] ${
                              fieldHasIssue ? (
                                issueSeverity === 'error' ? 'bg-red-100' : 'bg-yellow-100'
                              ) : ''
                            }`}
                            title={fieldHasIssue ? validationIssues.find(
                              issue => issue.row === actualIndex && issue.field === field
                            )?.message : ''}
                          >
                            {row[field] !== null && row[field] !== undefined ? String(row[field]) : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-500">
                Showing page {currentPage} of {totalPages}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 border rounded ${
                    currentPage === 1 
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Calculate page number to show
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 border rounded ${
                    currentPage === totalPages
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            selectedRows.length === 0 || isLoading
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={selectedRows.length === 0 || isLoading}
        >
          {isLoading ? 'Processing...' : `Import ${selectedRows.length} Vehicles`}
        </button>
      </div>
    </div>
  );
}
