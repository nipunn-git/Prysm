'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Book, 
  Heart, 
  Star, 
  GitMerge, 
  Users, 
  MapPin, 
  Link as LinkIcon, 
  Twitter, 
  Building, 
  Lock, 
  Eye, 
  Sparkles, 
  AlertCircle,
  Edit3,
  ArrowUpRight,
  Camera,
  Check,
  Loader2,
  Compass,
  Plus,
  Calendar
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { addCreatedRepoId } from '../../lib/repoStore';
import { API_URL } from '../../lib/api';
import { getCachedData, setCachedData } from '../../lib/cache';
import UserListModal from '../../components/UserListModal';
import { GridPulse } from "@/components/ui/grid-pulse";

const LEVEL_COLORS_DARK = [
  "bg-white/[0.06] border border-white/[0.04]", // 0
  "bg-emerald-950/80 border border-emerald-800/60", // 1
  "bg-emerald-800 border border-emerald-700", // 2
  "bg-emerald-600 border border-emerald-500", // 3
  "bg-emerald-400 border border-emerald-300", // 4
];

const LEVEL_COLORS_LIGHT = [
  "bg-neutral-100 border border-neutral-200/70", // 0
  "bg-emerald-100 border border-emerald-200", // 1
  "bg-emerald-300 border border-emerald-400", // 2
  "bg-emerald-500 border border-emerald-600", // 3
  "bg-emerald-600 border border-emerald-700", // 4
];

export default function ProfilePage() {
  const { user, updateProfile, isLoading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isEditing, setIsEditing] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    company: '',
    location: '',
    website: '',
    twitter: '',
    avatar: ''
  });

  // Profile repos, starred repos, and contributions state - 0ms instant hydration baseline!
  const [repos, setRepos] = useState(() => getCachedData('profile_my_repos', []));
  const [starredRepos, setStarredRepos] = useState(() => getCachedData('profile_my_starred', []));
  const [contributions, setContributions] = useState(() => getCachedData('profile_my_contributions', null));
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'repositories' | 'stars'
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [isCreatingSpecial, setIsCreatingSpecial] = useState(false);
  const [userListModalOpen, setUserListModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('followers');
  
  // GitHub Fetch Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large. Please choose an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchRepos = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      if (!effectiveUserId) return;
      
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      const res = await fetch(`${API_URL}/api/repositories?user_id=${encodeURIComponent(effectiveUserId)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const currentUsername = (user?.username || '').toLowerCase();
          const special = data.find(r => r?.name && r.name.toLowerCase() === currentUsername);
          if (special) addCreatedRepoId(special.id);
          
          setRepos(data);
          setCachedData('profile_my_repos', data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [user?.id, user?.username]);

  const fetchStarredRepos = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      if (!effectiveUserId) return;

      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      const res = await fetch(`${API_URL}/api/repositories/starred?user_id=${encodeURIComponent(effectiveUserId)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStarredRepos(data);
          setCachedData('profile_my_starred', data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [user?.id]);

  const fetchContributions = useCallback(async () => {
    try {
      const userId = user?.id || user?.username || 'default';
      const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(userId)}/contributions`);
      if (res.ok) {
        const data = await res.json();
        setContributions(data);
        setCachedData('profile_my_contributions', data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user?.id, user?.username]);

  const handleToggleStar = async (e, repoId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Optimistic toggle for repos
    let toggledRepo = null;
    setRepos(prev => {
      const updated = prev.map(r => {
        if (r.id === repoId) {
          const nextStarred = !r.is_starred;
          const nextCount = Math.max(0, (r.stars_count || 0) + (nextStarred ? 1 : -1));
          toggledRepo = { ...r, is_starred: nextStarred, stars_count: nextCount };
          return toggledRepo;
        }
        return r;
      });
      setCachedData('profile_my_repos', updated);
      return updated;
    });

    // Optimistic toggle for starredRepos
    setStarredRepos(prev => {
      const exists = prev.some(r => r.id === repoId);
      if (exists) {
        const filtered = prev.filter(r => r.id !== repoId);
        setCachedData('profile_my_starred', filtered);
        return filtered;
      } else {
        const target = toggledRepo || repos.find(r => r.id === repoId);
        if (target) {
          const updated = [{ ...target, is_starred: true, stars_count: (target.stars_count || 0) + 1 }, ...prev];
          setCachedData('profile_my_starred', updated);
          return updated;
        }
        return prev;
      }
    });

    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (effectiveUserId) queryParams.set('user_id', effectiveUserId);
      const headers = {
        ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
        ...(effectiveUserId ? { 'X-User-Id': effectiveUserId } : {})
      };
      const res = await fetch(`${API_URL}/api/repositories/${repoId}/star?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setRepos(prev => {
          const updated = prev.map(r => r.id === repoId ? { ...r, is_starred: data.starred, stars_count: data.stars_count } : r);
          setCachedData('profile_my_repos', updated);
          return updated;
        });
        if (!data.starred) {
          setStarredRepos(prev => {
            const filtered = prev.filter(r => r.id !== repoId);
            setCachedData('profile_my_starred', filtered);
            return filtered;
          });
        }
      }
    } catch (e) {
      console.error("Star toggle error:", e);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setFormData({
      username: user.username || '',
      name: user.name || '',
      bio: user.bio || '',
      company: user.company || '',
      location: user.location || '',
      website: user.website || '',
      twitter: user.twitter || '',
      avatar: user.avatar || ''
    });

    // Background SWR fetch
    fetchRepos();
    fetchStarredRepos();
    fetchContributions();
  }, [user, router, isLoading, fetchRepos, fetchStarredRepos, fetchContributions]);

  const checkUsername = async (uname) => {
    if (!uname || uname === user?.username) return true;
    setIsCheckingUsername(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/check-username?username=${encodeURIComponent(uname)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.available) {
          setUsernameError('Username is already taken');
          setIsCheckingUsername(false);
          return false;
        }
      }
    } catch {
      // ignore
    } finally {
      setIsCheckingUsername(false);
    }
    return true;
  };

  const handleSave = async () => {
    const currentUname = (user?.username || '').toLowerCase();
    const newUname = (formData.username || '').trim().toLowerCase();
    if (newUname && newUname !== currentUname) {
      const isAvailable = await checkUsername(newUname);
      if (!isAvailable) return;
    }
    const result = await updateProfile(formData);
    if (result?.success === false) {
      setUsernameError(result.error || 'Update failed');
      return;
    }
    setIsEditing(false);
    setUsernameError('');
    await fetchRepos();
  };

  const handleCancel = () => {
    setFormData({
      username: user.username || '',
      name: user.name || '',
      bio: user.bio || '',
      company: user.company || '',
      location: user.location || '',
      website: user.website || '',
      twitter: user.twitter || '',
      avatar: user.avatar || ''
    });
    setIsEditing(false);
  };

  const totalContributions = contributions?.total_contributions || 0;
  const weeks = contributions?.weeks || [];

  const monthLabels = [];
  if (Array.isArray(weeks) && weeks.length > 0) {
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      if (Array.isArray(week) && week.length > 0 && week[0]?.date) {
        try {
          const d = new Date(week[0].date);
          if (!isNaN(d.getTime())) {
            const month = d.getMonth();
            if (month !== lastMonth) {
              monthLabels.push({ idx, label: d.toLocaleString('default', { month: 'short' }) });
              lastMonth = month;
            }
          }
        } catch (e) {
          console.error("Heatmap date parsing error:", e);
        }
      }
    });
  }

  const currentUsername = (user?.username || '').toLowerCase();
  const specialRepo = Array.isArray(repos) ? repos.find(r => r?.name && r.name.toLowerCase() === currentUsername) : null;
  const levelColors = isDark ? LEVEL_COLORS_DARK : LEVEL_COLORS_LIGHT;

  const fetchGithubReadme = async () => {
    if (!githubUsername.trim()) return;
    setIsFetchingGithub(true);
    try {
      let uname = githubUsername.trim();
      if (uname.includes('github.com/')) {
        const parts = uname.split('github.com/');
        uname = parts[1].split('/')[0];
      }
      
      let res = await fetch(`https://api.github.com/repos/${uname}/${uname}/readme`, {
        headers: { 'Accept': 'application/vnd.github.v3.raw' }
      });
      
      if (res.ok) {
        const text = await res.text();
        setPreviewContent(text);
        setPreviewModalOpen(true);
        setShowGithubInput(false);
      } else {
        alert("Could not find a special README for that GitHub user. Make sure they have a public repository named exactly after their username with a README.md");
      }
    } catch {
      alert("Error fetching from GitHub");
    } finally {
      setIsFetchingGithub(false);
    }
  };

  const confirmCreateSpecialRepo = async () => {
    setIsCreatingSpecial(true);
    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      
      const queryParams = new URLSearchParams();
      if (effectiveUserId) queryParams.append('user_id', effectiveUserId);
      if (storedToken) queryParams.append('token', storedToken);

      const headers = { "Content-Type": "application/json" };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (effectiveUserId) headers['X-User-Id'] = effectiveUserId;

      const freshUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}') : {};
      const specialRepoName = user?.username || freshUser?.username || 'profile';
      
      const res = await fetch(`${API_URL}/api/repositories?${queryParams.toString()}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: specialRepoName,
          description: "My public profile README",
          category: "Other",
          visibility: "Private",
          initial_prompt: previewContent
        })
      });
      
      let resData;
      if (res.ok) {
        resData = await res.json();
        addCreatedRepoId(resData.id);
        await fetchRepos(); 
        setPreviewModalOpen(false);
      } else {
        resData = await res.json();
        if (resData.detail && resData.detail.includes("already exists")) {
          await fetchRepos();
          setPreviewModalOpen(false);
        } else {
          alert("Failed to create repository: " + resData.detail);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Network error occurred.");
    } finally {
      setIsCreatingSpecial(false);
    }
  };

  if (!user) return null;

  const filteredRepos = repos.filter(r => 
    !repoSearchQuery.trim() || 
    (r.name && r.name.toLowerCase().includes(repoSearchQuery.toLowerCase())) ||
    (r.description && r.description.toLowerCase().includes(repoSearchQuery.toLowerCase()))
  );

  return (
    <div className={`min-h-screen font-apple relative transition-colors duration-200 ${isDark ? "bg-[#05070c] text-[#f5f5f7]" : "bg-[#f8fafc] text-[#1d1d1f]"}`}>
      
      {/* Background Interactive Canvas GridPulse */}
      <GridPulse cell={28} reach={2.8} ambient={3} className="opacity-35 dark:opacity-20 pointer-events-none fixed inset-0 z-0" />

      {/* Social Media Cover Banner - Refined Apple Glass Gradient */}
      <div className="w-full h-44 sm:h-56 relative overflow-hidden border-b border-neutral-200/60 dark:border-white/[0.08] z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 dark:from-blue-600/15 dark:via-purple-600/10 dark:to-emerald-600/15" />
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 relative z-10 pb-24">
        
        {/* Profile Card Header */}
        <div className="flex flex-col md:flex-row gap-8 -mt-16 sm:-mt-20 mb-8">
          
          {/* Left Column: Avatar & Profile Info */}
          <div className="w-full md:w-[300px] shrink-0">
            <div 
              className="relative mb-5 inline-block cursor-pointer group"
              onClick={() => {
                if (!isEditing) setIsEditing(true);
                else fileInputRef.current?.click();
              }}
              title="Click to update photo"
            >
              <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full ring-4 ${isDark ? "ring-[#05070c] bg-neutral-900" : "ring-white bg-neutral-100"} shadow-2xl overflow-hidden flex items-center justify-center relative`}>
                {(isEditing ? formData.avatar : user.avatar) ? (
                  <img 
                    src={isEditing ? formData.avatar : user.avatar} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900">
                    <span className="text-5xl font-semibold tracking-tight text-neutral-600 dark:text-neutral-300">
                      {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                {/* Clean hover overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex flex-col items-center gap-1 text-white">
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-medium tracking-tight">{isEditing ? "Upload" : "Edit photo"}</span>
                  </div>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-3 mb-6 bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 shadow-sm animate-scaleUp">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 dark:text-white mb-1">Username</label>
                  <input 
                    type="text" 
                    value={formData.username} 
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/\s+/g, '-');
                      setFormData({...formData, username: val});
                      setUsernameError('');
                    }}
                    onBlur={() => formData.username !== user.username && checkUsername(formData.username)}
                    className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition border ${
                      isDark 
                        ? "bg-white/[0.06] border-white/10 text-white focus:border-blue-500" 
                        : "bg-neutral-100 border-neutral-200 text-neutral-900 focus:border-blue-500"
                    }`}
                  />
                  {isCheckingUsername && (
                    <span className="text-[11px] text-neutral-400 mt-1 block">Checking availability...</span>
                  )}
                  {usernameError && (
                    <span className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{usernameError}</span>
                  )}
                  {!usernameError && formData.username && formData.username !== user.username && !isCheckingUsername && (
                    <span className="text-[11px] text-emerald-500 mt-1 block">✓ Username available</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 dark:text-white mb-1">Display Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition border ${
                      isDark 
                        ? "bg-white/[0.06] border-white/10 text-white focus:border-blue-500" 
                        : "bg-neutral-100 border-neutral-200 text-neutral-900 focus:border-blue-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 dark:text-white mb-1">Bio</label>
                  <textarea 
                    value={formData.bio} 
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={3}
                    placeholder="Tell the community about yourself..."
                    className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition resize-none border ${
                      isDark 
                        ? "bg-white/[0.06] border-white/10 text-white placeholder:text-neutral-500 focus:border-blue-500" 
                        : "bg-neutral-100 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 dark:text-white mb-1">Company</label>
                  <input 
                    type="text" 
                    value={formData.company} 
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    placeholder="e.g. OpenAI / Google / Freelance"
                    className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition border ${
                      isDark 
                        ? "bg-white/[0.06] border-white/10 text-white placeholder:text-neutral-500 focus:border-blue-500" 
                        : "bg-neutral-100 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 dark:text-white mb-1">Location</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g. San Francisco, CA"
                    className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition border ${
                      isDark 
                        ? "bg-white/[0.06] border-white/10 text-white placeholder:text-neutral-500 focus:border-blue-500" 
                        : "bg-neutral-100 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 dark:text-white mb-1">Website</label>
                  <input 
                    type="text" 
                    value={formData.website} 
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://example.com"
                    className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition border ${
                      isDark 
                        ? "bg-white/[0.06] border-white/10 text-white placeholder:text-neutral-500 focus:border-blue-500" 
                        : "bg-neutral-100 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 dark:text-white mb-1">X / Twitter</label>
                  <input 
                    type="text" 
                    value={formData.twitter} 
                    onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                    placeholder="@handle"
                    className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition border ${
                      isDark 
                        ? "bg-white/[0.06] border-white/10 text-white placeholder:text-neutral-500 focus:border-blue-500" 
                        : "bg-neutral-100 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button 
                    onClick={handleSave} 
                    className="flex-1 bg-[#1d1d1f] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-medium py-2 px-3 rounded-xl transition shadow-sm"
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={handleCancel} 
                    className={`px-3 py-2 text-xs font-medium rounded-xl border transition ${
                      isDark ? "border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Name & Username (ID strictly removed) */}
                <div className="mb-4">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-tight">
                    {user.name || user.username}
                  </h1>
                  <span className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 font-normal block mt-0.5">
                    @{user.username}
                  </span>
                </div>

                {/* Edit & Public Profile Buttons */}
                <div className="flex items-center gap-2 mb-5">
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 border border-neutral-200/80 dark:border-white/10 text-neutral-900 dark:text-white text-xs font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                  <Link
                    href={`/u/${user.username}`}
                    title="View public profile"
                    className="p-2.5 bg-white/70 dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/15 border border-neutral-200/80 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 transition-all shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 mb-5 leading-relaxed bg-white/60 dark:bg-white/[0.04] backdrop-blur-md p-3.5 rounded-xl border border-neutral-200/70 dark:border-white/[0.06] shadow-sm">
                    {user.bio}
                  </p>
                )}

                {/* Follower Stats */}
                <div className="flex items-center gap-3 text-xs mb-5 text-neutral-500 dark:text-neutral-400 pb-5 border-b border-neutral-200/70 dark:border-white/[0.08]">
                  <div 
                    onClick={() => { setModalTab('followers'); setUserListModalOpen(true); }}
                    className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition group/stat"
                    title="View followers"
                  >
                    <Users className="w-3.5 h-3.5 group-hover/stat:text-neutral-900 dark:group-hover/stat:text-white" />
                    <span className="font-semibold text-neutral-900 dark:text-white">{user.followers_count ?? 0}</span>
                    <span className="group-hover/stat:underline">followers</span>
                  </div>
                  <span>·</span>
                  <div 
                    onClick={() => { setModalTab('following'); setUserListModalOpen(true); }}
                    className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition group/stat"
                    title="View following"
                  >
                    <span className="font-semibold text-neutral-900 dark:text-white">{user.following_count ?? 0}</span>
                    <span className="group-hover/stat:underline">following</span>
                  </div>
                  <span>·</span>
                  <div className="flex items-center gap-1.5">
                    <Book className="w-3.5 h-3.5" />
                    <span className="font-semibold text-neutral-900 dark:text-white">{repos.length}</span>
                    <span>prompts</span>
                  </div>
                </div>

                {/* Metadata list */}
                <ul className="text-xs space-y-2.5 text-neutral-500 dark:text-neutral-400">
                  {user.company && (
                    <li className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">{user.company}</span>
                    </li>
                  )}
                  {user.location && (
                    <li className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                      <span className="text-neutral-700 dark:text-neutral-300">{user.location}</span>
                    </li>
                  )}
                  {user.website && (
                    <li className="flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                      <a 
                        href={user.website.startsWith('http') ? user.website : `https://${user.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-500 hover:underline truncate"
                      >
                        {user.website}
                      </a>
                    </li>
                  )}
                  {user.twitter && (
                    <li className="flex items-center gap-2">
                      <Twitter className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                      <a 
                        href={`https://twitter.com/${user.twitter.replace('@', '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-500 hover:underline"
                      >
                        @{user.twitter.replace('@', '')}
                      </a>
                    </li>
                  )}
                  <li className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Joined {new Date(user.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                  </li>
                </ul>
              </>
            )}

          </div>

          {/* Right Column: Profile Navigation & Tabs */}
          <div className="flex-1 min-w-0 pt-2">
            
            {/* Social Profile Navigation Tabs - Apple Segmented Glass Bar */}
            <div className="flex items-center gap-2 p-1 bg-neutral-200/50 dark:bg-white/[0.06] backdrop-blur-xl rounded-xl border border-neutral-200/60 dark:border-white/[0.06] mb-6 w-fit">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeTab === "overview"
                    ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Book className="w-3.5 h-3.5" />
                Overview
              </button>

              <button
                onClick={() => setActiveTab("repositories")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeTab === "repositories"
                    ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                Repositories
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === "repositories" 
                    ? "bg-neutral-100 dark:bg-white/20 text-neutral-800 dark:text-white" 
                    : "bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-neutral-400"
                }`}>
                  {repos.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("stars")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeTab === "stars"
                    ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                Stars
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === "stars" 
                    ? "bg-neutral-100 dark:bg-white/20 text-neutral-800 dark:text-white" 
                    : "bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-neutral-400"
                }`}>
                  {starredRepos.length}
                </span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                {/* Special Profile README (Hero Card) */}
                {specialRepo ? (
                  <div className="mb-8 border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl overflow-hidden shadow-sm">
                    <div className="bg-neutral-100/60 dark:bg-white/[0.04] px-4 py-3 border-b border-neutral-200/80 dark:border-white/[0.08] text-xs font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-neutral-200 dark:bg-white/10 px-2 py-0.5 rounded-md font-semibold text-neutral-800 dark:text-neutral-200">
                          {user.username}
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400">/ README.md</span>
                      </div>
                      <span className="text-[11px] text-neutral-400">Your Profile Bio README</span>
                    </div>
                    <div className="p-6 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 prose prose-neutral dark:prose-invert max-w-none">
                      {specialRepo.latest_prompt ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {specialRepo.latest_prompt}
                        </ReactMarkdown>
                      ) : (
                        <p>This is your special profile bio repository.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-8 border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl p-5 bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                        {user.username} / {user.username} is a special repository
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Its <code className="bg-neutral-100 dark:bg-white/10 px-1 py-0.5 rounded font-mono">README.md</code> will appear on your public profile!
                      </p>
                    </div>
                    {showGithubInput ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input 
                          type="text" 
                          value={githubUsername}
                          onChange={(e) => setGithubUsername(e.target.value)}
                          placeholder="GitHub username or repo URL..."
                          className={`rounded-xl px-3 py-1.5 text-xs focus:outline-none transition border min-w-[200px] ${
                            isDark 
                              ? "bg-white/[0.06] border-white/10 text-white placeholder:text-neutral-500" 
                              : "bg-neutral-100 border-neutral-200 text-neutral-900 placeholder:text-neutral-400"
                          }`}
                          onKeyDown={(e) => e.key === 'Enter' && fetchGithubReadme()}
                        />
                        <button 
                          onClick={fetchGithubReadme}
                          disabled={isFetchingGithub || !githubUsername.trim()}
                          className="bg-[#1d1d1f] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-medium px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 whitespace-nowrap shadow-sm"
                        >
                          {isFetchingGithub ? "Fetching..." : "Fetch"}
                        </button>
                        <button 
                          onClick={() => setShowGithubInput(false)}
                          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white text-xs px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowGithubInput(true)}
                        className="bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 border border-neutral-200/80 dark:border-white/10 text-neutral-900 dark:text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-2 transition shadow-sm whitespace-nowrap"
                      >
                        <Book className="w-3.5 h-3.5" />
                        Fetch from GitHub
                      </button>
                    )}
                  </div>
                )}

                {/* Popular Repositories Grid */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Popular Repositories
                    </span>
                    <Link href="/new" className="text-xs font-medium text-blue-500 hover:underline flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Create new
                    </Link>
                  </div>
                  
                  {repos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {repos.slice(0, 6).map((repo) => (
                        <div 
                          key={repo.id}
                          onClick={() => router.push(`/repo/${repo.id}`)}
                          className="group flex flex-col justify-between border border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 rounded-2xl p-5 bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Book className="w-4 h-4 text-neutral-400 shrink-0" />
                                <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate group-hover:text-blue-500 transition">
                                  {repo.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 border border-neutral-200/70 dark:border-white/10 text-neutral-500 dark:text-neutral-400 shrink-0">
                                {repo.visibility || 'Public'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 line-clamp-2 leading-relaxed">
                              {repo.description || "Prompt repository"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-200/60 dark:border-white/[0.06]">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                repo.category === 'Coding' ? 'bg-blue-500' :
                                repo.category === 'Research' ? 'bg-emerald-500' :
                                repo.category === 'Writing' ? 'bg-purple-500' :
                                repo.category === 'Education' ? 'bg-amber-500' :
                                'bg-neutral-400'
                              }`} />
                              <span className="font-medium text-neutral-600 dark:text-neutral-300">{repo.category || 'Other'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => handleToggleStar(e, repo.id)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition ${
                                  repo.is_starred ? 'text-rose-500 font-medium' : 'text-neutral-400 hover:text-rose-500'
                                }`}
                              >
                                <Heart className={`w-3 h-3 ${repo.is_starred ? 'fill-rose-500 text-rose-500' : ''}`} />
                                <span>{repo.stars_count || 0}</span>
                              </button>
                              <span className="text-[11px] text-neutral-400 group-hover:text-blue-500 flex items-center gap-0.5 transition">
                                Open <ArrowUpRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-neutral-300 dark:border-white/15 rounded-2xl p-10 text-center bg-white/40 dark:bg-white/[0.02] backdrop-blur-md">
                      <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                        <Book className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1 text-neutral-900 dark:text-white">No repositories yet</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-sm mx-auto">
                        Create your first prompt repository to start versioning and sharing your AI workflows.
                      </p>
                      <Link 
                        href="/new" 
                        className="inline-flex items-center gap-1.5 bg-[#1d1d1f] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black px-4 py-2 rounded-xl text-xs font-medium transition shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create a repository
                      </Link>
                    </div>
                  )}
                </div>

                {/* Contribution Activity Heatmap */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Contribution Heatmap
                    </h2>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {totalContributions} contributions in the last year
                    </span>
                  </div>

                  <div className="border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl p-4 bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl shadow-sm">
                    <div className="relative h-4 mb-1 pl-8">
                      {monthLabels.map(({ idx, label }, i) => (
                        <div 
                          key={i} 
                          className="absolute text-[10px] text-neutral-400 font-medium"
                          style={{ left: `${32 + (idx * 13)}px` }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-[3px] overflow-x-auto no-scrollbar pb-2">
                      <div className="flex flex-col gap-[3px] pr-1 shrink-0">
                        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                          <div key={i} className="h-[10px] text-[9px] text-neutral-400 flex items-center">{label}</div>
                        ))}
                      </div>
                      
                      {weeks.length > 0 ? (
                        weeks.map((week, col) => (
                          <div key={col} className="flex flex-col gap-[3px]">
                            {week.map((day, row) => (
                              <div
                                key={row}
                                className={`w-[10px] h-[10px] rounded-sm ${levelColors[day.level]} cursor-pointer hover:scale-125 transition-all`}
                                title={`${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
                              />
                            ))}
                          </div>
                        ))
                      ) : (
                        Array.from({ length: 52 }).map((_, col) => (
                          <div key={col} className="flex flex-col gap-[3px]">
                            {Array.from({ length: 7 }).map((_, row) => (
                              <div key={row} className={`w-[10px] h-[10px] rounded-sm ${levelColors[0]}`} />
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {contributions?.recent_activities && contributions.recent_activities.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
                      Recent Activity
                    </h2>
                    <div className="border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl divide-y divide-neutral-200/60 dark:divide-white/[0.06] overflow-hidden shadow-sm">
                      {contributions.recent_activities.slice(0, 8).map((activity, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-blue-500 shrink-0">
                              {activity.type === 'repo_created' ? <Book className="w-4 h-4" /> : <GitMerge className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                                {activity.type === 'repo_created' ? 'Created repository ' : 'Made a commit in '}
                                {activity.repo_name ? (
                                  <Link href={`/repo/${activity.repo_id}`} className="text-blue-500 hover:underline font-mono">
                                    {activity.repo_name}
                                  </Link>
                                ) : (
                                  <span>prompt repository</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                            {activity.date ? (() => {
                              try {
                                const d = new Date(activity.date);
                                return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                              } catch { return ''; }
                            })() : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: REPOSITORIES */}
            {activeTab === 'repositories' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <input 
                    type="text" 
                    placeholder="Find a repository..." 
                    value={repoSearchQuery}
                    onChange={(e) => setRepoSearchQuery(e.target.value)}
                    className={`rounded-full px-4 py-2 text-xs focus:outline-none transition border flex-1 max-w-sm ${
                      isDark 
                        ? "bg-white/[0.06] border-white/10 text-white placeholder:text-neutral-500" 
                        : "bg-neutral-100 border-neutral-200 text-neutral-900 placeholder:text-neutral-400"
                    }`}
                  />
                  <Link 
                    href="/new"
                    className="bg-[#1d1d1f] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-medium px-4 py-2 rounded-full flex items-center gap-1.5 transition shadow-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Repository
                  </Link>
                </div>

                {filteredRepos.length > 0 ? (
                  <div className="border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl divide-y divide-neutral-200/60 dark:divide-white/[0.06] overflow-hidden shadow-sm">
                    {filteredRepos.map((repo) => (
                      <div key={repo.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Link href={`/repo/${repo.id}`} className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-blue-500 transition truncate">
                                {repo.name}
                              </Link>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 border border-neutral-200/70 dark:border-white/10 text-neutral-500 dark:text-neutral-400">
                                {repo.visibility || 'Public'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2">{repo.description || "Prompt repository"}</p>
                            <div className="flex items-center gap-4 text-[11px] text-neutral-400">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                  repo.category === 'Coding' ? 'bg-blue-500' :
                                  repo.category === 'Research' ? 'bg-emerald-500' :
                                  repo.category === 'Writing' ? 'bg-purple-500' :
                                  repo.category === 'Education' ? 'bg-amber-500' :
                                  'bg-neutral-400'
                                }`} />
                                <span>{repo.category || 'Other'}</span>
                              </div>
                              <span>Updated {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : ''}</span>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => handleToggleStar(e, repo.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition shrink-0 ${
                              repo.is_starred
                                ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400"
                                : "bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 border-neutral-200/70 dark:border-white/10 text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${repo.is_starred ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span>{repo.stars_count || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-neutral-400 border border-dashed border-neutral-200/80 dark:border-white/10 rounded-2xl">
                    No repositories match your search.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: STARS */}
            {activeTab === 'stars' && (
              <div className="space-y-4">
                {starredRepos.length > 0 ? (
                  <div className="border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl divide-y divide-neutral-200/60 dark:divide-white/[0.06] overflow-hidden shadow-sm">
                    {starredRepos.map((repo) => (
                      <div key={repo.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Link href={`/repo/${repo.id}`} className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-blue-500 transition truncate">
                                {repo.owner_username ? `${repo.owner_username} / ` : ''}{repo.name}
                              </Link>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 border border-neutral-200/70 dark:border-white/10 text-neutral-500 dark:text-neutral-400">
                                {repo.visibility || 'Public'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2">{repo.description || "Prompt repository"}</p>
                            <div className="flex items-center gap-4 text-[11px] text-neutral-400">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                  repo.category === 'Coding' ? 'bg-blue-500' :
                                  repo.category === 'Research' ? 'bg-emerald-500' :
                                  repo.category === 'Writing' ? 'bg-purple-500' :
                                  repo.category === 'Education' ? 'bg-amber-500' :
                                  'bg-neutral-400'
                                }`} />
                                <span>{repo.category || 'Other'}</span>
                              </div>
                              <span className="font-mono bg-neutral-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-neutral-600 dark:text-neutral-300">
                                {repo.latest_version || 'v1.0'}
                              </span>
                              <span>{repo.stars_count || 1} star{(repo.stars_count || 1) !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={(e) => handleToggleStar(e, repo.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 transition"
                              title="Unlike this prompt"
                            >
                              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                              <span>Starred</span>
                            </button>
                            <Link 
                              href={`/repo/${repo.id}`}
                              className="text-xs font-medium text-neutral-500 hover:text-blue-500 flex items-center gap-1 transition px-2 py-1"
                            >
                              Open <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-neutral-300 dark:border-white/15 rounded-2xl p-12 text-center bg-white/40 dark:bg-white/[0.02] backdrop-blur-md">
                    <Heart className="w-8 h-8 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                    <h3 className="text-sm font-semibold mb-1 text-neutral-900 dark:text-white">No starred repositories</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-sm mx-auto">
                      Explore prompt repositories published by the community and like the ones you find useful!
                    </p>
                    <Link 
                      href="/explore" 
                      className="inline-flex items-center gap-1.5 bg-[#1d1d1f] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black px-4 py-2 rounded-xl text-xs font-medium transition shadow-sm"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      Explore Repositories
                    </Link>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* AI Preview Modal (with smooth animations) */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scaleUp border ${
            isDark ? "bg-[#121620]/95 border-white/10 text-white" : "bg-white/95 border-neutral-200/80 text-neutral-900"
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              isDark ? "border-white/[0.08]" : "border-neutral-200/70"
            }`}>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Preview Profile README
              </h2>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <label className="block text-xs font-semibold mb-2">Edit your fetched README:</label>
              <textarea
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                className={`w-full rounded-2xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition border ${
                  isDark 
                    ? "bg-white/[0.04] border-white/10 text-neutral-200" 
                    : "bg-neutral-100 border-neutral-200 text-neutral-800"
                }`}
                rows={12}
              />
            </div>
            
            <div className={`p-4 border-t flex justify-end gap-2.5 ${
              isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-neutral-200/70 bg-neutral-50/50"
            }`}>
              <button 
                onClick={() => setPreviewModalOpen(false)}
                className={`px-4 py-2 text-xs font-medium rounded-xl border transition ${
                  isDark ? "border-white/10 text-neutral-300 hover:bg-white/10" : "border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={confirmCreateSpecialRepo}
                disabled={isCreatingSpecial}
                className="px-4 py-2 text-xs font-medium text-white bg-[#1d1d1f] hover:bg-black dark:bg-white dark:hover:bg-neutral-200 dark:text-black rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isCreatingSpecial ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Special Repo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Followers & Following Modal */}
      {user && (
        <UserListModal
          isOpen={userListModalOpen}
          onClose={() => setUserListModalOpen(false)}
          targetUser={user}
          initialTab={modalTab}
          currentUser={user}
        />
      )}
    </div>
  );
}