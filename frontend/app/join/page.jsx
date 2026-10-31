'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, Suspense } from 'react';
import { AuthComponent, DefaultPromptHubLogo } from '@/components/ui/sign-up';

function JoinContent() {
  const { user, isLoading: authLoading, register, loginWithProvider } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState('');

  // If already authenticated, skip join page and go straight to feed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('prompthub_token');
      const storedUser = localStorage.getItem('prompthub_user');
      if (storedToken && storedUser) {
        router.replace('/explore');
        return;
      }
    }
    if (!authLoading && user) {
      router.replace('/explore');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async ({ email, username, password }) => {
    setError('');
    setIsSubmitting(true);
    try {
      const chosenUname = (username || email.split('@')[0]).trim().toLowerCase().replace(/\s+/g, '-');
      await register(chosenUname, email.trim(), password, chosenUname);
      router.push('/explore');
    } catch (err) {
      setError(err.message || 'Registration failed');
      setIsSubmitting(false);
      throw err;
    }
  };

  const handleProviderLogin = async (provider) => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    setLoadingProvider(provider);
    try {
      await loginWithProvider(provider);
      router.push('/explore');
    } catch (err) {
      setError(err.message || `${provider} signup failed`);
      setIsSubmitting(false);
      setLoadingProvider('');
    }
  };

  return (
    <AuthComponent
      mode="signup"
      brandName="PromptHub"
      logo={<DefaultPromptHubLogo />}
      onGoogleLogin={() => handleProviderLogin('google')}
      onAppleLogin={() => handleProviderLogin('apple')}
      onSubmitAuth={handleSubmit}
      errorMessage={error}
      externalLoading={isSubmitting}
      loadingProvider={loadingProvider}
      bottomFooter={
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-sky-400 hover:text-sky-300 font-semibold hover:underline transition-colors ml-1">
            Sign in
          </Link>
        </p>
      }
    />
  );
}

export default function JoinPage() {
  return <JoinContent />;
}
