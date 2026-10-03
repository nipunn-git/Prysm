'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Initialize from local storage on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const idToken = await result.user.getIdToken();
          const email = result.user.email;
          const name = result.user.displayName;
          const avatar = result.user.photoURL;

          const res = await fetch(`${API_URL}/api/auth/firebase-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token: idToken,
              email: email,
              name: name,
              avatar: avatar
            })
          });
          
          if (res.ok) {
            const data = await res.json();
            setToken(data.access_token);
            setUser(data.user);
            localStorage.setItem('prompthub_token', data.access_token);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Redirect login failed:", error);
      }

      const storedToken = localStorage.getItem('prompthub_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      setToken(storedToken);
      fetchUser(storedToken).finally(() => setIsLoading(false));
    };

    initAuth();
  }, []);

  const fetchUser = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me?token=${encodeURIComponent(authToken)}`);
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setToken(authToken);
        return true;
      }
      logout();
      return false;
    } catch (e) {
      console.error(e);
      logout();
      return false;
    }
  };

  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || 'Login failed');
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('prompthub_token', data.access_token);
    return data.user;
  };

  const demoLogin = async () => {
    const res = await fetch(`${API_URL}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Demo login failed');
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('prompthub_token', data.access_token);
    return data.user;
  };

  const register = async (username, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, name: username, email, password })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || 'Registration failed');
    }
    // Auto login after register
    await login(username, password);
  };

  const updateProfile = async (updates) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/profile?token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('prompthub_token');
  };

  const loginWithProvider = async (providerName) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const provider = providerName === 'google' ? googleProvider : appleProvider;
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const email = result.user.email;
      const name = result.user.displayName;
      const avatar = result.user.photoURL;

      const res = await fetch(`${API_URL}/api/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: idToken,
          email: email,
          name: name,
          avatar: avatar
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Firebase login failed');
      }
      
      const data = await res.json();
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('prompthub_token', data.access_token);
      return data.user;
    } catch (e) {
      if (e.code === 'auth/popup-blocked') {
        const provider = providerName === 'google' ? googleProvider : appleProvider;
        await signInWithRedirect(auth, provider);
        return;
      }
      console.error("Provider login failed:", e);
      throw e;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticating, login, demoLogin, register, updateProfile, logout, loginWithProvider }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
