'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, 
  Search, 
  Plus, 
  X, 
  Compass, 
  User as UserIcon, 
  LogOut,
  FolderGit2,
  Check,
  Palette,
  UserPlus,
  Star as StarIcon,
  Trash2,
  CheckCheck,
  Bell,
  Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../lib/api';
import { getCachedData, cacheUser, cacheUsers, searchCachedUsers } from '../lib/cache';
import PromptHubWordmark from './PromptHubWordmark';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark, availableThemes, currentThemeObj } = useTheme();
  
  // Theme-aware icon colors for active & inactive states (supports both light and dark themes)
  const activeColor = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const inactiveColor = isDark ? 'text-[#8b949e] group-hover:text-[#f0f6fc]' : 'text-[#656d76] group-hover:text-[#1f2328]';
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [promptResults, setPromptResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Notifications State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const themeRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Use a ref to track the latest query for the debounced fetch
  const searchQueryRef = useRef(searchQuery);
  const searchAbortRef = useRef(null);
  searchQueryRef.current = searchQuery;

  const searchCacheRef = useRef(new Map());

  // The actual search function — fast with local caching and non-blocking abort handling
  const performSearch = useCallback(async (query) => {
    const trimmed = (query || '').trim();
    if (trimmed.length === 0) {
      setSearchResults([]);
      setPromptResults([]);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (searchCacheRef.current.has(cacheKey)) {
      const cachedData = searchCacheRef.current.get(cacheKey);
      setSearchResults(cachedData.users || []);
      setPromptResults(cachedData.prompts || []);
      setIsSearching(false);
    }
    
    // Cancel any in-flight request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;
    
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const res = await fetch(
        `${API_URL}/api/auth/users/search?q=${encodeURIComponent(trimmed)}${storedToken ? `&token=${encodeURIComponent(storedToken)}` : ''}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        cacheUsers(list);
        
        // Match prompts from locally cached explore repositories in 0ms
        const allCachedRepos = getCachedData('explore_all_repos', []) || [];
        const matchedPrompts = allCachedRepos.filter(r => 
          (r.name && r.name.toLowerCase().includes(cacheKey)) ||
          (r.description && r.description.toLowerCase().includes(cacheKey)) ||
          (r.category && r.category.toLowerCase().includes(cacheKey))
        ).slice(0, 4);

        searchCacheRef.current.set(cacheKey, { users: list, prompts: matchedPrompts });

        // Only update if this is still the current query (case-insensitive)
        if (searchQueryRef.current.trim().toLowerCase() === cacheKey) {
          setSearchResults(list);
          setPromptResults(matchedPrompts);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(e);
      }
    } finally {
      if (searchAbortRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, []);

  // Instant pre-match on keystroke (0ms!) across all cached users + 60ms background sync
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setSearchResults([]);
      setPromptResults([]);
      return;
    }
    
    const cacheKey = trimmed.toLowerCase();

    // 0ms instant pre-matching from global user and repo cache
    const localUserMatches = searchCachedUsers(trimmed);
    const cachedRepos = getCachedData('explore_all_repos', []) || [];
    const localPromptMatches = cachedRepos.filter(r => 
      (r.name && r.name.toLowerCase().includes(cacheKey)) ||
      (r.description && r.description.toLowerCase().includes(cacheKey)) ||
      (r.category && r.category.toLowerCase().includes(cacheKey))
    ).slice(0, 4);

    if (localUserMatches.length > 0 || localPromptMatches.length > 0) {
      setSearchResults(localUserMatches);
      setPromptResults(localPromptMatches);
    }
    setIsSearching(true);
    
    const timer = setTimeout(() => {
      performSearch(trimmed);
    }, 60);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Close dropdowns & modals on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setIsThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut listener (/ to open search, Escape to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
        setIsThemeOpen(false);
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('prompthub_user') || 'null') : null;
      const candidateId = user?.id || storedUser?.id;
      if (!storedToken && !candidateId) return;

      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (candidateId) queryParams.set('x_user_id', candidateId);

      const headers = {};
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (candidateId) headers['X-User-Id'] = candidateId;

      setIsLoadingNotifications(true);
      const res = await fetch(`${API_URL}/api/notifications?${queryParams.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0);
      }
    } catch (e) {
      // Silently catch network errors
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('prompthub_user') || 'null') : null;
      const candidateId = user?.id || storedUser?.id;

      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (candidateId) queryParams.set('x_user_id', candidateId);

      const headers = {};
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (candidateId) headers['X-User-Id'] = candidateId;

      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

      await fetch(`${API_URL}/api/notifications/read-all?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('prompthub_user') || 'null') : null;
        const candidateId = user?.id || storedUser?.id;

        const queryParams = new URLSearchParams();
        if (storedToken) queryParams.set('token', storedToken);
        if (candidateId) queryParams.set('x_user_id', candidateId);

        const headers = {};
        if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
        if (candidateId) headers['X-User-Id'] = candidateId;

        fetch(`${API_URL}/api/notifications/${notif.id}/read?${queryParams.toString()}`, {
          method: 'POST',
          headers
        });

        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsNotificationsOpen(false);
      if (notif.link) {
        router.push(notif.link);
      }
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('prompthub_user') || 'null') : null;
      const candidateId = user?.id || storedUser?.id;

      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (candidateId) queryParams.set('x_user_id', candidateId);

      const headers = {};
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (candidateId) headers['X-User-Id'] = candidateId;

      const target = notifications.find(n => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== id));

      await fetch(`${API_URL}/api/notifications/${id}?${queryParams.toString()}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('prompthub_user') || 'null') : null;
      const candidateId = user?.id || storedUser?.id;

      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (candidateId) queryParams.set('x_user_id', candidateId);

      const headers = {};
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (candidateId) headers['X-User-Id'] = candidateId;

      setNotifications([]);
      setUnreadCount(0);

      await fetch(`${API_URL}/api/notifications?${queryParams.toString()}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {
      console.error(e);
    }
  };

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return "recently";
    const parseStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const date = new Date(parseStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (pathname === '/login' || pathname === '/join' || pathname === '/') {
    return null; // Don't show navbar on auth/landing pages
  }

  return (
    <>
      <header className="bg-[#010409] border-b border-[#21262d] text-[#c9d1d9] h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none relative">
        {/* Left Side: Hamburger Menu + PromptHub Logo (No wordmark, prominent logo) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d] hover:border-[#8b949e] hover:bg-[#161b22] rounded-md transition"
          >
            <Menu className="w-4 h-4" />
          </button>

          <Link href="/explore" className="flex items-center hover:opacity-95 transition group" title="PromptHub Feed">
            <div className="relative flex items-center justify-center py-0.5">
              <div 
                className="logo-flashlight-glow absolute inset-0 -inset-x-3 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.25)_45%,transparent_80%)] blur-[9px] pointer-events-none rounded-full"
                aria-hidden="true" 
              />
              <img 
                src="/logo.png" 
                alt="PromptHub" 
                className="logo-drop-shadow h-12 sm:h-14 w-auto object-contain shrink-0 relative z-10 transition-transform group-hover:scale-105" 
                style={{ filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.75)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.35))" }}
              />
            </div>
          </Link>
        </div>

        {/* Center: Social Media/Home, Search Icon, Prysm AI, New Repo (+), Notifications (Bell) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2">
          {/* 1. Social Media / Home Icon (Filled when active, like Instagram) */}
          <Link
            href="/explore"
            title="Community Feed / Social"
            aria-label="Community Feed"
            className="p-2 sm:p-2.5 rounded-lg transition-transform flex items-center justify-center group"
          >
            {pathname === '/explore' ? (
              <svg 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className={`w-5 h-5 sm:w-[22px] sm:h-[22px] transition-all transform scale-105 ${activeColor}`}
              >
                <path d="M12 2.1a1 1 0 0 1 .64.24l9 7.5a1 1 0 0 1-1.28 1.54L20 11.06V20a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5a1 1 0 0 1-1 1H4a2 2 0 0 1-2-2v-8.94l-.36.32a1 1 0 0 1-1.28-1.54l9-7.5a1 1 0 0 1 .64-.24z" />
              </svg>
            ) : (
              <Home className={`w-5 h-5 sm:w-[22px] sm:h-[22px] stroke-[1.8] transition-all group-hover:scale-110 ${inactiveColor}`} />
            )}
          </Link>

          {/* 2. Search Icon (Magnifying Glass - Bold when active) */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            title="Search prompts or @users (Press /)"
            aria-label="Search prompts or users"
            className="p-2 sm:p-2.5 rounded-lg transition-transform flex items-center justify-center group"
          >
            <Search 
              className={`w-5 h-5 sm:w-[22px] sm:h-[22px] transition-all ${
                isSearchOpen 
                  ? `${activeColor} stroke-[3] scale-105` 
                  : `${inactiveColor} stroke-[1.8] group-hover:scale-110`
              }`} 
            />
          </button>

          {/* 3. Prysm AI Logo (After Magnifying Glass, Before +) */}
          <Link
            href="/dashboard"
            title="Prysm AI Studio"
            aria-label="Prysm AI Studio"
            className="p-1 sm:p-1.5 rounded-lg transition-transform flex items-center justify-center group relative"
          >
            <div 
              className={`logo-flashlight-glow absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.25)_50%,transparent_80%)] pointer-events-none rounded-full transition-opacity ${
                pathname === '/dashboard' ? 'blur-[9px] opacity-100' : 'blur-[7px] opacity-75 group-hover:opacity-100'
              }`}
              aria-hidden="true" 
            />
            <img 
              src="/prysm.png" 
              alt="Prysm AI" 
              className={`logo-drop-shadow w-7 h-7 sm:w-8 sm:h-8 object-contain relative z-10 transition-all ${
                pathname === '/dashboard'
                  ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.95)]'
                  : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.95)]'
              }`}
            />
          </Link>

          {/* 4. New Repo (+) Icon - Bold when active */}
          <Link
            href="/new"
            title="Create new repository"
            aria-label="Create new repository"
            className="p-2 sm:p-2.5 rounded-lg transition-transform flex items-center justify-center group"
          >
            <Plus 
              className={`w-5 h-5 sm:w-[22px] sm:h-[22px] transition-all ${
                pathname === '/new'
                  ? `${activeColor} stroke-[3] scale-105` 
                  : `${inactiveColor} stroke-[1.8] group-hover:scale-110`
              }`} 
            />
          </Link>

          {/* 5. Bell Icon (Notifications - Filled when active) */}
          <div className="relative" ref={notificationsRef}>
            <button 
              type="button"
              onClick={() => {
                const nextState = !isNotificationsOpen;
                setIsNotificationsOpen(nextState);
                if (nextState) fetchNotifications();
              }}
              title="Notifications"
              aria-label="Notifications"
              className="p-2 sm:p-2.5 rounded-lg transition-transform relative flex items-center justify-center group"
            >
              <Bell 
                className={`w-5 h-5 sm:w-[22px] sm:h-[22px] transition-all ${
                  isNotificationsOpen 
                    ? `${activeColor} fill-current stroke-[2] scale-105` 
                    : `${inactiveColor} fill-none stroke-[1.8] group-hover:scale-110`
                }`} 
              />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-[#1f6feb] text-white text-[10px] font-bold rounded-full ring-2 ring-[#010409] flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Interactive Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden z-50 text-xs text-[#c9d1d9] animate-scaleUp">
                {/* Dropdown Header */}
                <div className="px-4 py-3 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#f0f6fc]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-[#1f6feb]/20 text-[#58a6ff] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#1f6feb]/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-[#58a6ff] hover:underline flex items-center gap-1 font-medium"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-[#21262d]">
                  {isLoadingNotifications && notifications.length === 0 ? (
                    <div className="py-10 text-center text-[#8b949e] flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#58a6ff] animate-ping" />
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-12 px-4 text-center text-[#8b949e] flex flex-col items-center justify-center">
                      <Bell className="w-8 h-8 text-[#484f58] mb-2 stroke-[1.5]" />
                      <p className="text-xs font-semibold text-[#c9d1d9] mb-0.5">All caught up!</p>
                      <p className="text-[11px] text-[#8b949e] max-w-[220px]">
                        When someone follows you or stars your prompts, updates will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 flex items-start gap-3 hover:bg-[#1f6feb]/10 transition cursor-pointer group relative ${
                          !n.is_read ? 'bg-[#1f6feb]/5' : ''
                        }`}
                      >
                        {/* Avatar with type badge */}
                        <div className="relative shrink-0 mt-0.5">
                          <img
                            src={n.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.sender_username || 'user'}`}
                            alt={n.sender_name || 'User'}
                            className="w-8 h-8 rounded-full border border-[#30363d] object-cover"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-[#161b22] ${
                            n.type === 'star' ? 'bg-[#d29922] text-black' : 'bg-[#238636] text-white'
                          }`}>
                            {n.type === 'star' ? (
                              <StarIcon className="w-2.5 h-2.5 fill-current" />
                            ) : (
                              <UserPlus className="w-2.5 h-2.5" />
                            )}
                          </div>
                        </div>

                        {/* Message and time */}
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-xs text-[#c9d1d9] leading-snug group-hover:text-[#f0f6fc]">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-[#8b949e] mt-1 block">
                            {formatNotifTime(n.created_at)}
                          </span>
                        </div>

                        {/* Unread dot & Delete button */}
                        <div className="absolute right-3 top-3.5 flex items-center gap-1.5">
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#1f6feb] shrink-0" title="Unread" />
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(e, n.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#8b949e] hover:text-red-400 hover:bg-[#21262d] rounded transition"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Dropdown Footer */}
                {notifications.length > 0 && (
                  <div className="p-2 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-between text-[11px]">
                    <span className="text-[#8b949e]">
                      {notifications.length} notification{notifications.length > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={handleClearAllNotifications}
                      className="text-[#8b949e] hover:text-red-400 transition"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Profile Avatar / Dropdown */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)} 
                className="flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
                aria-label="User navigation"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-[#30363d] bg-[#21262d] flex items-center justify-center text-xs font-semibold text-white">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                </div>
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#161b22] border border-[#30363d] rounded-md shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#30363d] text-[#8b949e]">
                    Signed in as <br />
                    <span className="font-semibold text-sm text-[#f0f6fc]">{user?.username || 'user'}</span>
                    <span className="block text-[10px] text-[#8b949e] font-mono mt-0.5">ID: {user?.id}</span>
                  </div>
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-2 px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Your profile</span>
                  </Link>
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-2 px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Your repositories</span>
                  </Link>
                  <Link 
                    href="/explore" 
                    className="flex items-center gap-2 px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Explore</span>
                  </Link>
                  <div className="border-t border-[#30363d] my-1"></div>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsThemeOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5" />
                      <span>Theme / Settings</span>
                    </div>
                    <span className="text-[10px] text-[#8b949e] font-medium">{currentThemeObj?.name}</span>
                  </button>
                  <div className="border-t border-[#30363d] my-1"></div>
                  <button 
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                      router.push('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[#da3633] hover:bg-[#da3633] hover:text-white transition text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                href="/login" 
                className="text-xs font-semibold text-[#c9d1d9] hover:text-[#f0f6fc] px-2.5 py-1.5 rounded-md hover:bg-[#21262d] transition"
              >
                Sign in
              </Link>
              <Link 
                href="/join" 
                className="text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] px-2.5 py-1.5 rounded-md transition"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Centered Search Palette Modal (opens via search icon or pressing /) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs">
          <div 
            ref={searchRef}
            className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp"
          >
            <div className="flex items-center px-4 py-3.5 border-b border-[#30363d] gap-3 bg-[#0d1117]">
              <Search className="w-4 h-4 text-[#8b949e] shrink-0" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search prompts or @users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setIsSearchOpen(false);
                    setSearchResults([]);
                    router.push(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                className="w-full bg-transparent text-sm text-[#f0f6fc] placeholder:text-[#8b949e] focus:outline-none"
              />
              {searchQuery ? (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setPromptResults([]);
                  }}
                  className="p-1 text-[#8b949e] hover:text-[#f0f6fc] rounded transition"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block border border-[#30363d] bg-[#161b22] text-[#8b949e] text-[10px] px-1.5 py-0.5 rounded font-mono">
                  ESC
                </kbd>
              )}
            </div>

            {/* Live Search Results or Quick Navigation */}
            {searchQuery.trim().length > 0 ? (
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#21262d]">
                <div className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-[#8b949e] bg-[#161b22] flex items-center justify-between">
                  <span>Creators & Users</span>
                  <div className="flex items-center gap-1.5">
                    {isSearching && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-ping"></span>
                    )}
                    <span className="text-[9px] text-[#58a6ff]">
                      {searchResults.length > 0 ? `${searchResults.length} Found` : isSearching ? "Searching..." : "Live Search"}
                    </span>
                  </div>
                </div>
                {searchResults.length > 0 ? (
                  <div className="divide-y divide-[#21262d]">
                    {searchResults.map(u => (
                      <Link
                        key={u.id}
                        href={`/u/${u.username}`}
                        onClick={() => {
                          cacheUser(u);
                          setSearchQuery('');
                          setSearchResults([]);
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1f6feb]/20 hover:border-[#1f6feb]/40 transition group"
                      >
                        <img 
                          src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                          alt={u.username}
                          className="w-8 h-8 rounded-full border border-[#30363d] object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-[#f0f6fc] group-hover:text-[#58a6ff] truncate">{u.name}</span>
                          <span className="text-[11px] text-[#8b949e] truncate">@{u.username}</span>
                          <span className="text-[10px] text-[#484f58]">
                            {u.repos_count || 0} prompts · {u.followers_count || 0} followers
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : isSearching ? (
                  <div className="px-4 py-3 text-xs text-[#8b949e] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#58a6ff] animate-ping"></span>
                    Searching creators...
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-[#8b949e]">No users found for &quot;{searchQuery}&quot;</div>
                )}

                {promptResults.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-[#8b949e] bg-[#161b22] flex items-center justify-between border-t border-[#21262d]">
                      <span>Matching Prompts</span>
                      <span className="text-[9px] text-[#3fb950]">Instant</span>
                    </div>
                    <div className="divide-y divide-[#21262d]">
                      {promptResults.map(p => (
                        <Link
                          key={p.id}
                          href={`/repo/${p.id}`}
                          onClick={() => { setSearchQuery(''); setSearchResults([]); setPromptResults([]); setIsSearchOpen(false); }}
                          className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#238636]/20 transition group"
                        >
                          <FolderGit2 className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-[#f0f6fc] group-hover:text-[#58a6ff] truncate">{p.name}</span>
                            <span className="text-[10px] text-[#8b949e] truncate">{p.description || p.category}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                <Link
                  href={`/explore?search=${encodeURIComponent(searchQuery.trim())}`}
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setPromptResults([]); setIsSearchOpen(false); }}
                  className="block px-4 py-3 text-xs font-semibold text-[#58a6ff] hover:bg-[#0d1117] transition text-center"
                >
                  Search all community prompts for &quot;{searchQuery}&quot; →
                </Link>
              </div>
            ) : (
              <div className="p-4 text-xs text-[#8b949e] space-y-2">
                <p className="font-semibold text-[#c9d1d9] mb-2">Quick Navigation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link
                    href="/explore"
                    onClick={() => setIsSearchOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#30363d] hover:bg-[#21262d] text-[#c9d1d9] hover:text-white transition"
                  >
                    <Compass className="w-4 h-4 text-[#58a6ff]" />
                    <div>
                      <span className="font-medium text-xs block">Explore Prompts</span>
                      <span className="text-[10px] text-[#8b949e]">Trending community creations</span>
                    </div>
                  </Link>
                  <Link
                    href="/new"
                    onClick={() => setIsSearchOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#30363d] hover:bg-[#21262d] text-[#c9d1d9] hover:text-white transition"
                  >
                    <Plus className="w-4 h-4 text-[#3fb950]" />
                    <div>
                      <span className="font-medium text-xs block">New Repository</span>
                      <span className="text-[10px] text-[#8b949e]">Create a prompt repository</span>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Theme Modal (Accessible via Settings / Profile dropdown) */}
      {isThemeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div 
            ref={themeRef}
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden text-xs max-h-[85vh] flex flex-col ${
              isDark ? "bg-[#161b22] border-[#30363d] text-[#c9d1d9]" : "bg-white border-[#d0d7de] text-[#1f2328]"
            }`}
          >
            <div className={`px-4 py-3.5 border-b flex items-center justify-between shrink-0 ${
              isDark ? "border-[#30363d] bg-[#0d1117]" : "border-[#d0d7de] bg-[#f6f8fa]"
            }`}>
              <div>
                <div className={`font-semibold text-sm flex items-center gap-2 ${isDark ? "text-[#f0f6fc]" : "text-[#1f2328]"}`}>
                  <Palette className="w-4 h-4 text-[#58a6ff]" />
                  <span>Color Theme Settings</span>
                </div>
                <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#8b949e]" : "text-[#57606a]"}`}>
                  Choose your preferred appearance
                </p>
              </div>
              <button
                onClick={() => setIsThemeOpen(false)}
                className={`p-1.5 rounded-md transition ${isDark ? "text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]" : "text-[#57606a] hover:text-[#1f2328] hover:bg-[#eaeef2]"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 space-y-3">
              {/* Light Themes */}
              <div className="p-1">
                <div className="px-2 py-1 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                  <span>☀️ Light Themes</span>
                </div>
                <div className="space-y-1 mt-1">
                  {availableThemes.filter(t => !t.isDark).map((t) => {
                    const isActive = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          setIsThemeOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 transition ${
                          isActive 
                            ? 'bg-[#1f6feb]/15 border border-[#1f6feb]/40 text-[#f0f6fc]' 
                            : 'hover:bg-[#21262d] border border-transparent text-[#c9d1d9]'
                        }`}
                      >
                        <div 
                          className="w-5 h-5 rounded-md border shrink-0 mt-0.5 shadow-xs flex items-center justify-center overflow-hidden"
                          style={{ backgroundColor: t.bg, borderColor: t.border }}
                        >
                          <div className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: t.accent }}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-[#f0f6fc]">{t.name}</span>
                            {isActive && <Check className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />}
                          </div>
                          <p className="text-[11px] text-[#8b949e] leading-snug mt-0.5">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dark Themes */}
              <div className="p-1">
                <div className="px-2 py-1 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                  <span>🟣 Dark Themes</span>
                </div>
                <div className="space-y-1 mt-1">
                  {availableThemes.filter(t => t.isDark).map((t) => {
                    const isActive = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          setIsThemeOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 transition ${
                          isActive 
                            ? 'bg-[#1f6feb]/15 border border-[#1f6feb]/40 text-[#f0f6fc]' 
                            : 'hover:bg-[#21262d] border border-transparent text-[#c9d1d9]'
                        }`}
                      >
                        <div 
                          className="w-5 h-5 rounded-md border shrink-0 mt-0.5 shadow-xs flex items-center justify-center overflow-hidden"
                          style={{ backgroundColor: t.bg, borderColor: t.border }}
                        >
                          <div className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: t.accent }}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-[#f0f6fc]">{t.name}</span>
                            {isActive && <Check className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />}
                          </div>
                          <p className="text-[11px] text-[#8b949e] leading-snug mt-0.5">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hamburger Drawer Menu */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          <div className="relative w-80 max-w-full bg-[#161b22] border-r border-[#30363d] h-full p-4 flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div 
                    className="logo-flashlight-glow absolute inset-0 -inset-x-2 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.2)_50%,transparent_80%)] blur-[7px] pointer-events-none" 
                    aria-hidden="true"
                  />
                  <img 
                    src="/logo.png" 
                    alt="PromptHub" 
                    className="logo-drop-shadow h-9 w-auto object-contain shrink-0 relative z-10" 
                    style={{ filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.7))" }}
                  />
                </div>
                <PromptHubWordmark height="h-5" />
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="text-[#8b949e] hover:text-[#f0f6fc] p-1 rounded-md hover:bg-[#21262d]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Drawer Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#8b949e]" />
                <input 
                  type="text" 
                  placeholder="Search prompts or @users..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setIsDrawerOpen(false);
                      setSearchResults([]);
                      router.push(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#58a6ff] text-[#c9d1d9] placeholder:text-[#8b949e]"
                />
              </div>
              {searchQuery.trim().length > 0 && searchResults.length > 0 && (
                <div className="mt-2 bg-[#0d1117] border border-[#30363d] rounded-lg max-h-48 overflow-y-auto divide-y divide-[#21262d]">
                  {searchResults.map(u => (
                    <Link
                      key={u.id}
                      href={`/u/${u.username}`}
                      onClick={() => {
                        cacheUser(u);
                        setIsDrawerOpen(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="flex items-center gap-2.5 p-2 hover:bg-[#21262d] transition"
                    >
                      <img 
                        src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                        alt={u.username}
                        className="w-6 h-6 rounded-full border border-[#30363d] object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#f0f6fc] truncate">{u.name}</div>
                        <div className="text-[10px] text-[#8b949e] truncate">@{u.username}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <nav className="space-y-1 text-sm font-medium text-[#c9d1d9] flex-1 overflow-y-auto">
              <Link 
                href="/dashboard" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition"
              >
                <FolderGit2 className="w-4 h-4 text-[#8b949e]" />
                Home / Dashboard
              </Link>
              <Link 
                href="/explore" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition"
              >
                <Compass className="w-4 h-4 text-[#8b949e]" />
                Explore Community
              </Link>
              <Link 
                href="/new" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition"
              >
                <Plus className="w-4 h-4 text-[#8b949e]" />
                New repository
              </Link>
              <Link 
                href="/profile" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition"
              >
                <UserIcon className="w-4 h-4 text-[#8b949e]" />
                Profile
              </Link>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsNotificationsOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition text-left"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-[#8b949e]" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-[#1f6feb] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Theme section inside drawer */}
              <div className="pt-3 mt-3 border-t border-[#30363d]">
                <div className="px-3 py-1 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#58a6ff]" />
                    <span>Theme</span>
                  </span>
                  <span className="text-[10px] text-[#58a6ff] lowercase font-normal">{currentThemeObj?.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2 px-1">
                  {availableThemes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`text-left px-2 py-1.5 rounded-md border text-[11px] flex items-center gap-1.5 transition ${
                        theme === t.id 
                          ? 'border-[#58a6ff] bg-[#1f6feb]/20 text-[#f0f6fc] font-semibold' 
                          : 'border-[#30363d] hover:bg-[#21262d] text-[#8b949e]'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.accent }}></div>
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            <div className="pt-3 border-t border-[#30363d] text-xs text-[#8b949e]">
              <p>© 2026 PromptHub, Inc.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
