'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Users, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../lib/api';
import { cacheUser, cacheUsers } from '../lib/cache';

export default function UserListModal({
  isOpen,
  onClose,
  targetUser,
  initialTab = 'followers',
  currentUser
}) {
  const router = useRouter();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(initialTab); // 'followers' | 'following'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followMap, setFollowMap] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const fetchUsers = useCallback(async (tab) => {
    if (!targetUser?.id && !targetUser?.username) return;
    setLoading(true);
    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = currentUser?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);

      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (effectiveUserId) queryParams.set('x_user_id', effectiveUserId);

      const targetId = targetUser.id || targetUser.username;
      const endpoint = `${API_URL}/api/auth/users/${encodeURIComponent(targetId)}/${tab}?${queryParams.toString()}`;
      
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setUsers(list);
        cacheUsers(list);
        const map = {};
        list.forEach(u => {
          map[u.id] = Boolean(u.is_following);
        });
        setFollowMap(prev => ({ ...prev, ...map }));
      } else {
        setUsers([]);
      }
    } catch (e) {
      console.error(`Failed to fetch ${tab}:`, e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [targetUser, currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers(activeTab);
    }
  }, [isOpen, activeTab, fetchUsers]);

  // Handle follow / unfollow toggle with 0ms optimistic update
  const handleToggleFollow = async (e, targetUserId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (actionLoading[targetUserId]) return;

    // Optimistic toggle
    const prevStatus = Boolean(followMap[targetUserId]);
    setFollowMap(prev => ({ ...prev, [targetUserId]: !prevStatus }));
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));

    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = currentUser?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);

      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (effectiveUserId) queryParams.set('user_id', effectiveUserId);

      const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(targetUserId)}/follow?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setFollowMap(prev => ({ ...prev, [targetUserId]: data.following }));
      } else {
        // Rollback
        setFollowMap(prev => ({ ...prev, [targetUserId]: prevStatus }));
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      setFollowMap(prev => ({ ...prev, [targetUserId]: prevStatus }));
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fadeIn font-apple">
      <div 
        className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp border ${
          isDark 
            ? "bg-[#121620]/90 backdrop-blur-2xl border-white/10 text-white" 
            : "bg-white/95 backdrop-blur-2xl border-neutral-200/80 text-neutral-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-neutral-200/70 bg-neutral-50/50"
        }`}>
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm font-semibold tracking-tight">
              {targetUser?.name || targetUser?.username || 'User'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition ${
              isDark ? "text-neutral-400 hover:text-white hover:bg-white/10" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={`flex border-b ${
          isDark ? "border-white/[0.08] bg-white/[0.01]" : "border-neutral-200/70 bg-neutral-50/30"
        }`}>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-xs font-medium text-center border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'followers'
                ? (isDark ? 'border-white text-white' : 'border-neutral-900 text-neutral-900')
                : (isDark ? 'border-transparent text-neutral-400 hover:text-neutral-200' : 'border-transparent text-neutral-500 hover:text-neutral-800')
            }`}
          >
            Followers
            {activeTab === 'followers' && !loading && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isDark ? "bg-white/15 text-white" : "bg-neutral-200 text-neutral-800"
              }`}>
                {users.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-xs font-medium text-center border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'following'
                ? (isDark ? 'border-white text-white' : 'border-neutral-900 text-neutral-900')
                : (isDark ? 'border-transparent text-neutral-400 hover:text-neutral-200' : 'border-transparent text-neutral-500 hover:text-neutral-800')
            }`}
          >
            Following
            {activeTab === 'following' && !loading && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isDark ? "bg-white/15 text-white" : "bg-neutral-200 text-neutral-800"
              }`}>
                {users.length}
              </span>
            )}
          </button>
        </div>

        {/* User List Body */}
        <div className={`flex-1 overflow-y-auto p-3 divide-y ${
          isDark ? "divide-white/[0.04]" : "divide-neutral-100"
        }`}>
          {loading ? (
            <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading {activeTab}...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center px-4">
              <Users className="w-10 h-10 mb-3 stroke-[1.5] text-neutral-300 dark:text-neutral-600" />
              <p className="text-sm font-semibold mb-1 text-neutral-800 dark:text-neutral-200">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
              <p className="text-xs text-neutral-500 max-w-xs">
                {activeTab === 'followers' 
                  ? 'When other users follow this account, they will appear here.'
                  : 'Follow other creators in the Prysm community to see them here.'}
              </p>
            </div>
          ) : (
            users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const isFollowing = followMap[u.id];
              const isLoadingBtn = actionLoading[u.id];

              return (
                <div 
                  key={u.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl transition ${
                    isDark ? "hover:bg-white/[0.04]" : "hover:bg-neutral-100/60"
                  }`}
                >
                  <Link
                    href={`/u/${u.username}`}
                    onClick={() => {
                      cacheUser(u);
                      onClose();
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                      alt={u.username}
                      className="w-10 h-10 rounded-full border border-neutral-200 dark:border-white/10 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate group-hover:text-blue-500 transition">
                        {u.name || u.username}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        @{u.username}
                      </div>
                      {u.bio && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5 line-clamp-1">
                          {u.bio}
                        </p>
                      )}
                      <div className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-2">
                        <span>{u.repos_count || 0} prompts</span>
                        <span>·</span>
                        <span>{u.followers_count || 0} followers</span>
                      </div>
                    </div>
                  </Link>

                  {/* Follow Button (if not viewing own profile item) */}
                  {!isSelf && currentUser && (
                    <button
                      onClick={(e) => handleToggleFollow(e, u.id)}
                      disabled={isLoadingBtn}
                      className={`text-xs font-medium px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
                        isFollowing
                          ? (isDark 
                              ? 'bg-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 border border-white/10 text-neutral-300' 
                              : 'bg-neutral-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 border border-neutral-200 text-neutral-800')
                          : (isDark 
                              ? 'bg-white hover:bg-neutral-200 text-black font-semibold' 
                              : 'bg-[#1d1d1f] hover:bg-black text-white font-semibold')
                      }`}
                    >
                      {isLoadingBtn ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}