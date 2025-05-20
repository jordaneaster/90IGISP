'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiService from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function ItemDetailPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Fetch item details once we have the ID and are authenticated
    if (id && user) {
      const fetchItem = async () => {
        try {
          const response = await apiService.getItemById(id);
          setItem(response.data);
          setFormData({
            name: response.data.name,
            description: response.data.description
          });
        } catch (err) {
          setError('Failed to load item details.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchItem();
    }
  }, [id, user, authLoading, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await apiService.updateItem(id, formData);
      setItem(response.data);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update item.');
      console.error(err);
    }
  };

  if (authLoading || isLoading) return <div>Loading item details...</div>;
  if (!user) return null; // Will redirect in useEffect
  if (error) return <div className="text-red-500">{error}</div>;
  if (!item) return <div>Item not found</div>;

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="mb-6 flex items-center">
        <Link href="/items" className="text-blue-500 hover:underline mr-4">
          ← Back to Items
        </Link>
        <h1 className="text-2xl font-bold">{isEditing ? 'Edit Item' : 'Item Details'}</h1>
      </div>
      
      {isEditing ? (
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
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white p-6 rounded shadow-md">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">{item.name}</h2>
            <p className="text-gray-700">{item.description}</p>
          </div>
          
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this item?')) {
                apiService.deleteItem(id).then(() => {
                  router.push('/items');
                });
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
