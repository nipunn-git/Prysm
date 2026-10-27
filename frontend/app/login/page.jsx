'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { AuthComponent, DefaultPromptHubLogo } from '@/components/ui/sign-up';

export default function LoginPage() {
  const { user, isLoading: authLoading, login, loginWithProvider } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState('');

  // If already authenticated, skip login page and go straight to dashboard
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

  const handleSubmit = async ({ email, password }) => {
    setError('');
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      setIsLoading(false);
      throw err;
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
    <AuthComponent
      mode="login"
      brandName="PromptHub"
      logo={<DefaultPromptHubLogo />}
      onGoogleLogin={() => handleProviderLogin('google')}
      onAppleLogin={() => handleProviderLogin('apple')}
      onSubmitAuth={handleSubmit}
      errorMessage={error}
      externalLoading={isLoading}
      loadingProvider={loadingProvider}
      bottomFooter={
        <p className="text-xs text-slate-400">
          New to PromptHub?{' '}
          <Link href="/join" className="text-sky-400 hover:text-sky-300 font-semibold hover:underline transition-colors ml-1">
            Create an account
          </Link>
        </p>
      }
    />
  );
}
