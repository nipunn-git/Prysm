'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Fast path: immediately check localStorage if available -> default to feed (/explore)
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token');
      const storedUser = localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user');
      if (storedToken && storedUser) {
        router.replace('/explore');
        return;
      }
    }

    if (!isLoading) {
      if (user) {
        router.replace('/explore');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-transparent" />
  );
}
