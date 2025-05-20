'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiService from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function NewItemPage() {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await apiService.createItem(formData);
      router.push('/items');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create item.');
      setIsLoading(false);
    }
  };

  if (authLoading) return <div>Loading...</div>;
  if (!user) return null; // Will redirect in useEffect

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="mb-6 flex items-center">
        <Link href="/items" className="text-blue-500 hover:underline mr-4">
          ← Back to Items
        </Link>
        <h1 className="text-2xl font-bold">Create New Item</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            required
          ></textarea>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
