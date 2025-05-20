'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { login } = useAuth();

  // Auto-login on page load
  useEffect(() => {
    const autoLogin = async () => {
      try {
        await login();
        router.push('/routes');
      } catch (error) {
        console.error('Auto-login error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    autoLogin();
  }, [login, router]);

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 text-center">
          {isLoading ? 'Auto-logging in...' : 'Logged in as admin (MVP mode)'}
        </div>
        
        {!isLoading && (
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/routes')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Go to Application
            </button>
          </div>
        )}
        
        <p className="text-center text-gray-500 text-xs mt-4">
          MVP Mode: Authentication is bypassed with hardcoded credentials
        </p>
      </div>
    </div>
  );
}
