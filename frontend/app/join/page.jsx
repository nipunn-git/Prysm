'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, Suspense } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { API_URL } from '../../lib/api';

function JoinContent() {
  const { user, isLoading: authLoading, register, loginWithProvider } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUsername = searchParams ? (searchParams.get('username') || '') : '';

  const [username, setUsername] = useState(initialUsername);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState('');

  // Live username availability check state
  const [usernameStatus, setUsernameStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameMessage, setUsernameMessage] = useState('');

  // Pre-fill if url params change
  useEffect(() => {
    if (initialUsername && !username) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  // If already authenticated, skip join page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('prompthub_token');
      const storedUser = localStorage.getItem('prompthub_user');
      if (storedToken && storedUser) {
        router.replace('/dashboard');
        return;
      }
    }
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Debounced real-time username availability check
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/\s+/g, '-');
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    if (clean.length < 2) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username must be at least 2 characters');
      return;
    }

    if (clean.length > 30) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username cannot exceed 30 characters');
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Only letters, numbers, hyphens, and underscores allowed');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/users/check-username?username=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setUsernameStatus('available');
            setUsernameMessage(`@${clean} is available!`);
          } else {
            setUsernameStatus('taken');
            setUsernameMessage(data.reason || `@${clean} is already taken`);
          }
        }
      } catch (e) {
        setUsernameStatus('idle');
        setUsernameMessage('');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUname = username.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleanUname || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (usernameStatus === 'taken') {
      setError('Please choose an available username before submitting.');
      return;
    }

    if (usernameStatus === 'invalid') {
      setError(usernameMessage || 'Please enter a valid username');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(cleanUname, email.trim(), password, name.trim());
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  const handleProviderLogin = async (provider) => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    setLoadingProvider(provider);
    try {
      await loginWithProvider(provider);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || `${provider} signup failed`);
      setIsSubmitting(false);
      setLoadingProvider('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[340px] flex flex-col items-center">
        <div className="mb-6 relative flex items-center justify-center">
          <div 
            className="logo-flashlight-glow absolute inset-0 -inset-x-4 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.2)_45%,transparent_80%)] blur-[10px] pointer-events-none rounded-full" 
            aria-hidden="true"
          />
          <img 
            src="/logo.png" 
            alt="PromptHub" 
            className="logo-drop-shadow w-24 h-auto object-contain relative z-10" 
            style={{ filter: "drop-shadow(0 0 12px rgba(255, 255, 255, 0.75)) drop-shadow(0 0 24px rgba(255, 255, 255, 0.35))" }}
          />
        </div>
        <h1 className="text-2xl font-light text-foreground mb-1 tracking-tight">
          Join PromptHub
        </h1>
        <p className="text-xs text-[#8b949e] mb-4 text-center">
          Create your account and claim your unique username
        </p>
        
        <div className="w-full bg-[#161b22] border border-border rounded-md p-5 shadow-sm mb-4">
          <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
            {error && (
              <div className="text-red-400 bg-red-950/40 border border-red-800/60 rounded px-3 py-2 text-xs">
                {error}
              </div>
            )}

            {/* Username with real-time live availability check */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="username" className="block text-xs font-medium text-foreground">
                  Username <span className="text-red-400">*</span>
                </label>
                {usernameStatus === 'checking' && (
                  <span className="text-[11px] text-[#8b949e] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-[#58a6ff]" /> checking...
                  </span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-[11px] text-[#3fb950] font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Available
                  </span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-[11px] text-[#f85149] font-semibold flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Taken
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="e.g. dev_sarah"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full bg-[#0d1117] border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] transition-colors text-foreground ${
                    usernameStatus === 'available'
                      ? 'border-[#238636] focus:border-[#2ea043] focus:ring-1 focus:ring-[#2ea043]'
                      : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-[#da3633] focus:border-[#f85149] focus:ring-1 focus:ring-[#f85149]'
                      : 'border-[#30363d] focus:border-accent focus:ring-1 focus:ring-accent'
                  }`}
                  autoComplete="username"
                />
              </div>
              {usernameMessage && (
                <p className={`text-[11px] mt-1 ${
                  usernameStatus === 'available' 
                    ? 'text-[#3fb950]' 
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'text-[#f85149]'
                    : 'text-[#8b949e]'
                }`}>
                  {usernameMessage}
                </p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-foreground mb-1">
                Full name <span className="text-[#8b949e] font-normal">(optional)</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Sarah Miller"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-foreground placeholder:text-[#484f58]"
                autoComplete="name"
              />
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-foreground mb-1">
                Email address <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-foreground placeholder:text-[#484f58]"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-foreground mb-1">
                Password <span className="text-red-400">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-foreground"
                autoComplete="new-password"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 px-4 rounded-md text-center transition-colors mt-2 cursor-pointer shadow-sm"
            >
              {isSubmitting && !loadingProvider ? 'Creating your account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-4 border-t border-border pt-4 flex flex-col gap-2.5">
            <button 
              type="button"
              onClick={() => handleProviderLogin('google')}
              disabled={isSubmitting}
              className="w-full bg-[#0d1117] border border-[#30363d] hover:border-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed text-foreground text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Sign up with Google</span>
            </button>
          </div>
        </div>

        <div className="w-full border border-border rounded-md p-3.5 text-center text-xs text-foreground bg-transparent">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline font-semibold">
            Sign in
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-[#8b949e]">Loading...</div>}>
      <JoinContent />
    </Suspense>
  );
}
