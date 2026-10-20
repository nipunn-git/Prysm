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
        <div className="relative flex items-center justify-center">
          <div 
            className="logo-flashlight-glow absolute inset-0 -inset-x-4 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.2)_45%,transparent_80%)] blur-xl pointer-events-none rounded-full animate-pulse" 
            aria-hidden="true"
          />
          <img 
            src="/logo.png" 
            alt="PromptHub" 
            className="logo-drop-shadow w-28 h-auto object-contain animate-pulse relative z-10" 
            style={{ filter: "drop-shadow(0 0 16px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 32px rgba(255, 255, 255, 0.4))" }}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#8b949e]">
          <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff]" />
          <span>Loading PromptHub...</span>
        </div>
      </div>
    </div>
  );
}
