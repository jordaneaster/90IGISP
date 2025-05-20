'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiService from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Fetch items
    if (user) {
      const fetchItems = async () => {
        try {
          const response = await apiService.getItems();
          setItems(response.data);
        } catch (err) {
          setError('Failed to load items.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchItems();
    }
  }, [user, authLoading, router]);

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await apiService.deleteItem(id);
        setItems(items.filter(item => item.id !== id));
      } catch (err) {
        setError('Failed to delete item.');
        console.error(err);
      }
    }
  };

  if (authLoading || isLoading) return <div>Loading items...</div>;
  if (!user) return null; // Will redirect in useEffect

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">All Items</h1>
        <Link href="/items/new" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
          Add New Item
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p>No items found. Create your first item!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div 
              key={item.id} 
              className="border rounded-lg overflow-hidden shadow-lg"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2">{item.name}</h2>
                <p className="text-gray-700 mb-4">{item.description}</p>
                <div className="flex justify-between">
                  <Link 
                    href={`/items/${item.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    View Details
                  </Link>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
