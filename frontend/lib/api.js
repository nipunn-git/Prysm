/**
 * Central API URL configuration for PromptHub
 * Fallback to production backend on Vercel if NEXT_PUBLIC_API_URL is unset
 */
export const API_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://prompthub-backend-ifv8.onrender.com');

export default API_URL;
