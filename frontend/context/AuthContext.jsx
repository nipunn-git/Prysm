'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  OAuthProvider
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../lib/firebase';
import { API_URL } from '../lib/api';

// Cross-browser safe storage wrapper (handles Safari Private mode, Opera GX, Brave shields)
const safeStorage = {
  getItem: (key) => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage write notice:", e);
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch {}
  }
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Persist user data across all browsers securely
  const persistUser = (userData, authToken) => {
    if (userData && authToken) {
      safeStorage.setItem('prysm_token', authToken);
      safeStorage.setItem('prysm_user', JSON.stringify(userData));
      safeStorage.setItem('prompthub_token', authToken);
      safeStorage.setItem('prompthub_user', JSON.stringify(userData));
    }
  };

  // Initialize authentication on mount (with redirect result check for Safari/Opera/Mobile)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const idToken = await result.user.getIdToken();
          const email = result.user.email;
          let name = result.user.displayName;

          // Apple OAuth name extraction
          try {
            const credential = OAuthProvider.credentialFromResult(result);
            if (!name && credential?.fullName) {
              const { givenName, familyName } = credential.fullName;
              name = [givenName, familyName].filter(Boolean).join(' ');
            }
          } catch (cErr) {
            console.warn("Redirect credential parse notice:", cErr);
          }

          if (!name && email) {
            name = email.split('@')[0];
          }

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
            persistUser(data.user, data.access_token);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Redirect login check:", error);
      }

      const storedToken = safeStorage.getItem('prysm_token') || safeStorage.getItem('prompthub_token');
      const storedUser = safeStorage.getItem('prysm_user') || safeStorage.getItem('prompthub_user');
      
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      
      // Immediately restore cached user so there's 0ms blank screen
      if (storedUser) {
        try {
          const cachedUser = JSON.parse(storedUser);
          setUser(cachedUser);
          setToken(storedToken);
          setIsLoading(false);
        } catch (e) {
          console.error("Failed to parse cached user:", e);
        }
      }
      
      // Validate token with backend in background
      try {
        const cachedUser = storedUser ? JSON.parse(storedUser) : null;
        const candidateId = cachedUser?.id;
        const queryParams = new URLSearchParams();
        if (storedToken) queryParams.set('token', storedToken);
        if (candidateId) queryParams.set('user_id', candidateId);
        
        const headers = {};
        if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
        if (candidateId) headers['X-User-Id'] = candidateId;

        const res = await fetch(`${API_URL}/api/auth/me?${queryParams.toString()}`, { headers });
        if (res.ok) {
          const userData = await res.json();
          const effectiveToken = storedToken || `token_${userData.id}`;
          setUser(userData);
          setToken(effectiveToken);
          persistUser(userData, effectiveToken);
        } else {
          // Token invalid or user missing from DB - self heal with sync
          if (cachedUser && (cachedUser.id || cachedUser.username || cachedUser.email)) {
            try {
              const syncRes = await fetch(`${API_URL}/api/auth/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: cachedUser.id,
                  username: cachedUser.username,
                  name: cachedUser.name,
                  email: cachedUser.email,
                  avatar: cachedUser.avatar
                })
              });
              if (syncRes.ok) {
                const syncedUser = await syncRes.json();
                const syncedToken = `token_${syncedUser.id}`;
                setUser(syncedUser);
                setToken(syncedToken);
                persistUser(syncedUser, syncedToken);
              }
            } catch (syncErr) {
              console.warn("Self-healing sync failed:", syncErr);
            }
          }
        }
      } catch (e) {
        console.warn("Network notice during token validation, using cached session");
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const fetchUser = async (authToken) => {
    try {
      const storedUser = typeof window !== 'undefined' ? (localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user')) : null;
      const cachedUser = storedUser ? JSON.parse(storedUser) : null;
      const candidateId = cachedUser?.id;
      
      const queryParams = new URLSearchParams();
      if (authToken) queryParams.set('token', authToken);
      if (candidateId) queryParams.set('user_id', candidateId);
      
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (candidateId) headers['X-User-Id'] = candidateId;

      const res = await fetch(`${API_URL}/api/auth/me?${queryParams.toString()}`, { headers });
      if (res.ok) {
        const userData = await res.json();
        const effectiveToken = authToken || `token_${userData.id}`;
        setUser(userData);
        setToken(effectiveToken);
        persistUser(userData, effectiveToken);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
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
    persistUser(data.user, data.access_token);
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
    persistUser(data.user, data.access_token);
    return data.user;
  };

  const register = async (username, email, password, name = '') => {
    const cleanUname = (username || '').trim().toLowerCase().replace(/\s+/g, '-');
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || cleanUname).trim();
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUname, name: cleanName, email: cleanEmail, password })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Registration failed');
    }
    // Auto login after register
    return await login(cleanUname, password);
  };


  const updateProfile = async (updates) => {
    const currentToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null);
    const currentUser = user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || 'null') : null);
    const currentUserId = currentUser?.id;
    
    if (!currentToken && !currentUserId) return { success: false, error: 'Not logged in' };
    
    const queryParams = new URLSearchParams();
    if (currentToken) queryParams.set('token', currentToken);
    if (currentUserId) queryParams.set('user_id', currentUserId);
    
    const headers = { 
      'Content-Type': 'application/json'
    };
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
    if (currentUserId) headers['X-User-Id'] = currentUserId;

    try {
      const res = await fetch(`${API_URL}/api/auth/profile?${queryParams.toString()}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });
      
      if (res.ok) {
        const updatedUser = await res.json();
        const newToken = `token_${updatedUser.id}`;
        setUser(updatedUser);
        setToken(newToken);
        persistUser(updatedUser, newToken);
        return { success: true, user: updatedUser };
      }
      
      // If token expired or invalid, check if we can refresh via Firebase
      if (res.status === 401 && auth?.currentUser) {
        try {
          const freshIdToken = await auth.currentUser.getIdToken(true);
          const refreshRes = await fetch(`${API_URL}/api/auth/firebase-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token: freshIdToken,
              email: auth.currentUser.email,
              name: auth.currentUser.displayName,
              avatar: auth.currentUser.photoURL
            })
          });
          if (refreshRes.ok) {
            const freshData = await refreshRes.json();
            setToken(freshData.access_token);
            setUser(freshData.user);
            persistUser(freshData.user, freshData.access_token);
            
            // Retry the update with the new token
            const retryRes = await fetch(`${API_URL}/api/auth/profile?token=${encodeURIComponent(freshData.access_token)}&user_id=${encodeURIComponent(freshData.user.id)}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${freshData.access_token}`,
                'X-User-Id': freshData.user.id
              },
              body: JSON.stringify(updates)
            });
            if (retryRes.ok) {
              const retriedUser = await retryRes.json();
              const newToken = `token_${retriedUser.id}`;
              setUser(retriedUser);
              setToken(newToken);
              persistUser(retriedUser, newToken);
              return { success: true, user: retriedUser };
            }
          }
        } catch (refreshErr) {
          console.error("Auto token refresh error:", refreshErr);
        }
      }

      const errorData = await res.json().catch(() => ({}));
      return { success: false, error: errorData.detail || 'Update failed' };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };


  const logout = () => {
    setUser(null);
    setToken(null);
    safeStorage.removeItem('prysm_token');
    safeStorage.removeItem('prysm_user');
    safeStorage.removeItem('prompthub_token');
    safeStorage.removeItem('prompthub_user');
  };

  const loginWithProvider = async (providerName) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const provider = providerName === 'google' ? googleProvider : appleProvider;
      let result;

      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupErr) {
        // Cross-browser resilience: Opera, Brave, Safari, and Mobile browsers frequently block or partition popups.
        const isPopupInterrupted = 
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          popupErr.code === 'auth/operation-not-supported-in-this-environment' ||
          (popupErr.code === 'auth/popup-closed-by-user' && typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

        if (isPopupInterrupted) {
          console.warn(`Popup interrupted (${popupErr.code}), gracefully falling back to redirect authentication...`);
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }

      if (!result || !result.user) {
        throw new Error("Authentication failed: No user returned");
      }

      const idToken = await result.user.getIdToken();
      const email = result.user.email;
      let name = result.user.displayName;

      // Apple OAuth support: extract full name if returned in credential
      if (!name && providerName === 'apple') {
        try {
          const credential = OAuthProvider.credentialFromResult(result);
          if (credential?.fullName) {
            const { givenName, familyName } = credential.fullName;
            name = [givenName, familyName].filter(Boolean).join(' ');
          }
        } catch (credErr) {
          console.warn("Apple credential parse note:", credErr);
        }
        if (!name && email) {
          name = email.split('@')[0];
        }
      }

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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Authentication failed on server');
      }
      
      const data = await res.json();
      setToken(data.access_token);
      setUser(data.user);
      persistUser(data.user, data.access_token);
      return data.user;
    } catch (e) {
      if (e.code === 'auth/popup-blocked') {
        const provider = providerName === 'google' ? googleProvider : appleProvider;
        await signInWithRedirect(auth, provider);
        return;
      }
      console.error("Provider login error:", e);
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
