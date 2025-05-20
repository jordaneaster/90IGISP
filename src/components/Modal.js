'use client';

import { useEffect, useRef } from 'react';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actionButton = null,
  size = 'md' // 'sm', 'md', 'lg', 'xl'
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent scrolling on body when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        ref={modalRef}
        className={`bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full overflow-hidden`}
        style={{ zIndex: 10000 }} // Additional inline style to ensure it's above all elements
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          {children}
        </div>

        {actionButton && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
}
