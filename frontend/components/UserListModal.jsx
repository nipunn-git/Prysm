'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Users, UserPlus, UserCheck, Loader2, Book } from 'lucide-react';
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
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (currentUser?.id) queryParams.set('x_user_id', currentUser.id);

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

  // Handle follow / unfollow toggle
  const handleToggleFollow = async (e, targetUserId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (actionLoading[targetUserId]) return;

    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (currentUser?.id) queryParams.set('x_user_id', currentUser.id);

      const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(targetUserId)}/follow?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setFollowMap(prev => ({ ...prev, [targetUserId]: data.following }));
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#58a6ff]" />
            <h3 className="text-base font-semibold text-[#f0f6fc]">
              {targetUser?.name || targetUser?.username || 'User'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-lg transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#30363d] bg-[#0d1117]/60">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'followers'
                ? 'border-[#58a6ff] text-[#58a6ff]'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            Followers
            {activeTab === 'followers' && !loading && (
              <span className="bg-[#21262d] px-1.5 py-0.5 rounded-full text-[10px] text-[#c9d1d9] font-mono">
                {users.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'border-[#58a6ff] text-[#58a6ff]'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            Following
            {activeTab === 'following' && !loading && (
              <span className="bg-[#21262d] px-1.5 py-0.5 rounded-full text-[10px] text-[#c9d1d9] font-mono">
                {users.length}
              </span>
            )}
          </button>
        </div>

        {/* User List Body */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#21262d]/60">
          {loading ? (
            <div className="py-16 text-center text-[#8b949e] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#58a6ff]" />
              <span className="text-xs">Loading {activeTab}...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-[#8b949e] flex flex-col items-center justify-center px-4">
              <Users className="w-10 h-10 text-[#484f58] mb-3 stroke-[1.5]" />
              <p className="text-sm font-semibold text-[#c9d1d9] mb-1">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
              <p className="text-xs text-[#8b949e] max-w-xs">
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
                  className="flex items-center justify-between gap-3 p-3 hover:bg-[#21262d]/40 rounded-xl transition"
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
                      className="w-10 h-10 rounded-full border border-[#30363d] object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#f0f6fc] group-hover:text-[#58a6ff] truncate transition">
                        {u.name || u.username}
                      </div>
                      <div className="text-[11px] text-[#8b949e] truncate">
                        @{u.username}
                      </div>
                      {u.bio && (
                        <p className="text-[11px] text-[#8b949e] truncate mt-0.5 line-clamp-1">
                          {u.bio}
                        </p>
                      )}
                      <div className="text-[10px] text-[#484f58] mt-0.5 flex items-center gap-2">
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
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition ${
                        isFollowing
                          ? 'bg-[#21262d] hover:bg-red-950/40 hover:border-red-700/60 hover:text-red-400 border border-[#363b42] text-[#c9d1d9]'
                          : 'bg-[#238636] hover:bg-[#2ea043] text-white'
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
