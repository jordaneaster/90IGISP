'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    }
  }, [pathname]); // Re-check when path changes

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    router.push('/');
  };

  return (
    <header className="flex justify-between items-center p-4 border-b">
      <div className="logo">
        <Link href="/" className="text-xl font-bold">
          My Service
        </Link>
      </div>
      <nav>
        <ul className="flex space-x-4">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          {isAuthenticated ? (
            <>
              <li>
                <Link href="/items" className="hover:underline">
                  Items
                </Link>
              </li>
              <li>
                <button 
                  onClick={handleLogout}
                  className="hover:underline"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link href="/login" className="hover:underline">
                Login
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
