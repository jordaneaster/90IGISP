import React from 'react';
import QrScanner from '@/components/QrScanner';

const ScanPage = () => {
  return (
    <div className="scan-page">
      <h1 className="text-xl font-bold">Scan Vehicle QR Code</h1>
      <QrScanner />
      <p className="text-xs text-gray-400">
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        If you encounter issues, ensure the barcode type is supported. Common types include QR Code, Code 128, EAN-13, and UPC-A. For a full list, check the &quot;Supported Formats&quot; or refer to the scanner&apos;s documentation.
      </p>
    </div>
  );
};

export default ScanPage;