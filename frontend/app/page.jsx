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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#010409] text-[#c9d1d9]">
      <div className="flex flex-col items-center gap-4">
        <Terminal className="w-10 h-10 text-[#58a6ff] animate-pulse" />
        <div className="flex items-center gap-2 text-sm text-[#8b949e]">
          <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff]" />
          <span>Loading PromptHub...</span>
        </div>
      </div>
    </div>
  );
}
