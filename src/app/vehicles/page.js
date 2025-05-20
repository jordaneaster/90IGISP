'use client';

import React, { useState, useEffect } from 'react';
import { fetchVehicles, applyFilters } from './api';
import { Dialog, DialogTitle } from '@mui/material';

const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]); // Added fetchVehicles to dependency array

  useEffect(() => {
    applyFilters();
  }, [filters, vehicles, applyFilters]); // Added applyFilters to dependency array

  return (
    <div>
      <Dialog open={true}>
        <DialogTitle>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          Vehicle&apos;s Current Status & Details
        </DialogTitle>
        {/* Dialog content */}
      </Dialog>
    </div>
  );
};

export default VehiclesPage;