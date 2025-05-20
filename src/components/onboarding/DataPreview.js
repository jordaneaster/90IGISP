import React, { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@components/Dialog';

const DataPreview = ({ rowsWithErrors }) => {
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    if (selectAll) {
      setSelectedRows(rowsWithErrors.map((_, index) => index));
    } else if (selectedRows.length === rowsWithErrors.length && rowsWithErrors.length > 0) {
      // This case handles when selectAll was true, then a row is deselected,
      // or if all rows were manually selected.
      // If we want to uncheck "Select All" when a single row is deselected after "Select All" was active,
      // this logic might need adjustment based on exact desired UX.
      // For now, if all are selected, keep selectAll true. If not, it's handled by individual checks.
    }
  }, [selectAll, rowsWithErrors, selectedRows]); // Added missing dependencies

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogDescription>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          Are you sure you want to delete the selected row(s)? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
    </div>
  );
};

export default DataPreview;