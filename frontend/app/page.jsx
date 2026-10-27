'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Terminal, Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Fast path: immediately check localStorage if available
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('prompthub_token');
      const storedUser = localStorage.getItem('prompthub_user');
      if (storedToken && storedUser) {
        router.replace('/dashboard');
        return;
      }
    }

    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-transparent" />
  );
}
