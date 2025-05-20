import React, { useState } from 'react';
import QrReader from 'react-qr-reader';

const QrScanner = () => {
  const [scanResult, setScanResult] = useState('');
  const [error, setError] = useState('');

  const handleScan = (data) => {
    if (data) {
      setScanResult(data);
      setError('');
    }
  };

  const handleError = (err) => {
    setError('Error scanning the code. Please try again.');
    console.error(err);
  };

  return (
    <div className="qr-scanner">
      <h1 className="text-lg font-bold">QR Code Scanner</h1>
      <QrReader
        delay={300}
        onError={handleError}
        onScan={handleScan}
        style={{ width: '100%' }}
      />
      {/* User guidance text */}
      <p className="mt-2 text-sm text-gray-500">
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        Position the QR code or barcode within the scanner&apos;s frame.
      </p>

      {/* Displaying the scanned data or error messages */}
      {scanResult && (
        <p className="mt-4 text-green-500">Scanned Data: {scanResult}</p>
      )}
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );
};

export default QrScanner;