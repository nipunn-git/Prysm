/**
 * Central API URL configuration for PromptHub
 * Fallback to production backend on Vercel if NEXT_PUBLIC_API_URL is unset
 */
const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
// If someone mistakenly set NEXT_PUBLIC_API_URL to an old vercel.app serverless function, ignore and use Render
const isBrokenVercelBackend = configuredUrl && configuredUrl.includes('vercel.app');

export const API_URL = 
  (configuredUrl && !isBrokenVercelBackend)
    ? configuredUrl
    : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:8000'
        : 'https://prompthub-backend-ifv8.onrender.com');

export default API_URL;
