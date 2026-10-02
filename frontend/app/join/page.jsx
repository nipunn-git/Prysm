'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function JoinPage() {
  const { register, loginWithProvider } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (username.trim() && email.trim() && password) {
      try {
        await register(username.trim(), email.trim(), password);
        router.push('/dashboard');
      } catch (err) {
        setError(err.message || 'Registration failed');
      }
    }
  };

  const handleProviderLogin = async (provider) => {
    setError('');
    try {
      await loginWithProvider(provider);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || `${provider} signup failed`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[308px] flex flex-col items-center">
        <div className="mb-6">
          <Terminal className="w-12 h-12 text-foreground" />
        </div>
        <h1 className="text-2xl font-light text-foreground mb-4 tracking-tight">
          Join PromptHub
        </h1>
        
        <div className="w-full bg-[#161b22] border border-border rounded-md p-4 shadow-sm mb-4">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-foreground"
                autoComplete="username"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-foreground"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:bg-[#0d1117] focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-foreground"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="w-full bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold py-2 px-4 rounded-md text-center transition-colors mt-2">
              Create account
            </button>
          </form>

          <div className="mt-4 border-t border-border pt-4 flex flex-col gap-3">
            <button 
              onClick={() => handleProviderLogin('google')}
              className="w-full bg-[#0d1117] border border-[#30363d] hover:border-muted text-foreground text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              Sign up with Google
            </button>
            <button 
              onClick={() => handleProviderLogin('apple')}
              className="w-full bg-[#0d1117] border border-[#30363d] hover:border-muted text-foreground text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              Sign up with Apple
            </button>
          </div>
        </div>

        <div className="w-full border border-border rounded-md p-4 text-center text-sm text-foreground bg-transparent">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
