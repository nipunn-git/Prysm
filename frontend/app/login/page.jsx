'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Terminal, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function LoginPage() {
  const { login, loginWithProvider } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (username.trim() && password) {
      setIsLoading(true);
      try {
        await login(username.trim(), password);
        router.push('/dashboard');
      } catch (err) {
        setError(err.message || 'Login failed');
        setIsLoading(false);
      }
    }
  };


  const handleProviderLogin = async (provider) => {
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    setLoadingProvider(provider);
    try {
      await loginWithProvider(provider);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || `${provider} login failed`);
      setIsLoading(false);
      setLoadingProvider('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[340px] flex flex-col items-center">
        <div className="mb-6 flex items-center gap-2">
          <Terminal className="w-10 h-10 text-foreground" />
        </div>
        <h1 className="text-2xl font-light text-foreground mb-4 tracking-tight">
          Sign in to PromptHub
        </h1>


        <div className="w-full bg-[#161b22] border border-border rounded-md p-5 shadow-sm mb-4">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error && (
              <div className="text-red-400 bg-red-950/40 border border-red-800/60 rounded px-3 py-2 text-xs">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-foreground mb-1.5">
                Username or email address
              </label>
              <input
                id="email"
                name="email"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-foreground"
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-foreground">
                  Password
                </label>
                <Link href="#" className="text-xs text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-foreground"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 px-4 rounded-md text-center transition-colors mt-1 shadow-sm cursor-pointer"
            >
              {isLoading && !loadingProvider ? 'Signing in...' : 'Sign in with credentials'}
            </button>
          </form>

          <div className="mt-4 border-t border-border pt-4 flex flex-col gap-2.5">
            <button 
              type="button"
              onClick={() => handleProviderLogin('google')}
              disabled={isLoading}
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
              <span>Continue with Google</span>
            </button>
            <button 
              type="button"
              onClick={() => handleProviderLogin('apple')}
              disabled={isLoading}
              className="w-full bg-[#0d1117] border border-[#30363d] hover:border-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed text-foreground text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {loadingProvider === 'apple' ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.74-11.64-14.1-5.18-8.16-9.28-17.72-12.3-28.69-3.03-10.97-4.54-21.73-4.54-32.28 0-14.16 3.49-26.04 10.47-35.63 6.98-9.6 15.62-14.48 25.93-14.65 4.35 0 9.28 1.15 14.78 3.45 5.5 2.3 9.4 3.51 11.72 3.63 2.11-.12 6.13-1.39 12.06-3.82 5.93-2.42 11.02-3.48 15.27-3.17 11.45.87 20.65 5.48 27.59 13.82-9.92 5.99-14.77 14.3-14.56 24.94.22 8.37 3.36 15.27 9.42 20.7 6.06 5.43 13.19 8.61 21.39 9.54-2.12 6.53-4.74 13.3-7.86 20.31zM119.22 33.74c0-7.29 2.59-14.28 7.77-20.97 5.18-6.69 11.75-11.3 19.7-13.83-.22 1.53-.44 2.84-.66 3.93-.87 6.97-3.76 13.73-8.67 20.28-4.91 6.55-11.16 10.99-18.75 13.32-.43-1-.65-2.22-.65-3.66z" />
                </svg>
              )}
              <span>Continue with Apple</span>
            </button>
          </div>
        </div>

        <div className="w-full border border-border rounded-md p-4 text-center text-sm text-foreground bg-transparent">
          New to PromptHub?{' '}
          <Link href="/join" className="text-accent hover:underline">
            Create an account
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
