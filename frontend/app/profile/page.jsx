'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Book, Star, GitMerge, Users, MapPin, Link as LinkIcon, Twitter, Building, Lock, Eye, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useAuth } from '../../context/AuthContext';
import { addCreatedRepoId } from '../../lib/repoStore';
import { API_URL } from '../../lib/api';
import { getCachedData, setCachedData } from '../../lib/cache';
import UserListModal from '../../components/UserListModal';

const LEVEL_COLORS = [
  "bg-[#161b22]",   // level 0 - no contributions
  "bg-[#0e4429]",   // level 1
  "bg-[#006d32]",   // level 2
  "bg-[#26a641]",   // level 3
  "bg-[#39d353]",   // level 4
];

export default function ProfilePage() {
  const { user, updateProfile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isEditing, setIsEditing] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    company: '',
    location: '',
    website: '',
    twitter: ''
  });

  // Profile repos and contributions state - safe initial SSR baseline
  const [repos, setRepos] = useState([]);
  const [contributions, setContributions] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
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
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64 DB storage
        alert("Image is too large. Please choose an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchRepos = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      if (!effectiveUserId) return;
      
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      const res = await fetch(`${API_URL}/api/repositories?user_id=${encodeURIComponent(effectiveUserId)}&_t=${Date.now()}`, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Auto-recover special repo if it exists in DB but not in localStorage
          const currentUsername = (user?.username || '').toLowerCase();
          const special = data.find(r => r?.name && r.name.toLowerCase() === currentUsername);
          if (special) addCreatedRepoId(special.id);
          
          // All repos from DB for this user - no localStorage filtering
          setRepos(data);
          setCachedData('profile_my_repos', data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [user?.id, user?.username]);

  const fetchContributions = useCallback(async () => {
    try {
      const userId = user?.id || user?.username || 'default';
      const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(userId)}/contributions`, { cache: 'no-store' });
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
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
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
        setRepos(prev => prev.map(r => r.id === repoId ? { ...r, is_starred: data.starred, stars_count: data.stars_count } : r));
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

    // Hydrate cached data immediately on mount
    const cachedR = getCachedData('profile_my_repos', []);
    if (cachedR && cachedR.length > 0) setRepos(cachedR);
    const cachedC = getCachedData('profile_my_contributions', null);
    if (cachedC) setContributions(cachedC);

    fetchRepos();
    fetchContributions();
  }, [user, router, isLoading, fetchRepos, fetchContributions]);

  // Re-fetch repos whenever the page regains focus (e.g., switching tabs, navigating back)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchRepos();
      }
    };
    const handleFocus = () => {
      if (user) fetchRepos();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchRepos]);

  // Re-fetch repos on pathname change (Next.js client-side navigation)
  useEffect(() => {
    if (pathname === '/profile' && user) {
      fetchRepos();
    }
  }, [pathname, user, fetchRepos]);

  if (isLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#010409] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#58a6ff] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Check username uniqueness
  const checkUsername = async (username) => {
    if (!username || username === user.username) {
      setUsernameError('');
      return true;
    }
    // Validate format
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setUsernameError('Username can only contain letters, numbers, hyphens, and underscores');
      return false;
    }
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }
    setIsCheckingUsername(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/users/check-username?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.available) {
          setUsernameError(`Username "${username}" is already taken`);
          return false;
        }
        setUsernameError('');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingUsername(false);
    }
    return true;
  };

  const handleSave = async () => {
    // Check username uniqueness if it changed
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

  // Month labels for the heatmap
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

  const fetchGithubReadme = async () => {
    if (!githubUsername.trim()) return;
    setIsFetchingGithub(true);
    try {
      // Extract username if they pasted a URL
      let uname = githubUsername.trim();
      if (uname.includes('github.com/')) {
        const parts = uname.split('github.com/');
        uname = parts[1].split('/')[0];
      }
      
      let res = await fetch(`https://api.github.com/repos/${uname}/${uname}/readme`, {
        headers: {
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
      
      if (res.ok) {
        const text = await res.text();
        setPreviewContent(text);
        setPreviewModalOpen(true);
        setShowGithubInput(false);
      } else {
        alert("Could not find a special README for that GitHub user. Make sure they have a public repository named exactly after their username with a README.md");
      }
    } catch (e) {
      alert("Error fetching from GitHub");
    } finally {
      setIsFetchingGithub(false);
    }
  };

  const confirmCreateSpecialRepo = async () => {
    setIsCreatingSpecial(true);
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      
      const queryParams = new URLSearchParams();
      if (effectiveUserId) queryParams.append('user_id', effectiveUserId);
      if (storedToken) queryParams.append('token', storedToken);

      const headers = { "Content-Type": "application/json" };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (effectiveUserId) headers['X-User-Id'] = effectiveUserId;

      // Always use the freshest username for the special repo name
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
          // If the repository already exists but was missing from local storage,
          // fetchRepos (which we just patched) will auto-recover it on next load.
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

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <div className="w-full md:w-[296px] shrink-0">
        <div className="relative mb-4 group cursor-pointer" onClick={() => {
          if (!isEditing) setIsEditing(true);
          else if (fileInputRef.current) fileInputRef.current.click();
        }}>
          <div className="w-full aspect-square rounded-full border border-[#30363d] bg-[#21262d] overflow-hidden flex items-center justify-center relative">
            {(isEditing ? formData.avatar : user.avatar) ? (
              <img 
                src={isEditing ? formData.avatar : user.avatar} 
                alt="Profile Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-6xl font-bold text-[#8b949e]">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
            {/* Hover overlay like GitHub */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-sm font-semibold">{isEditing ? "Upload" : "Edit"}</span>
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
          <div className="flex flex-col gap-3 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-1">Username</label>
              <input 
                type="text" 
                value={formData.username} 
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/\s+/g, '-');
                  setFormData({...formData, username: val});
                  setUsernameError('');
                }}
                onBlur={() => formData.username !== user.username && checkUsername(formData.username)}
                className={`w-full bg-[#0d1117] border rounded-md px-3 py-1 text-sm focus:outline-none text-[#c9d1d9] ${usernameError ? 'border-[#da3633] focus:border-[#da3633]' : 'border-[#30363d] focus:border-[#58a6ff]'}`}
              />
              {isCheckingUsername && (
                <span className="text-[11px] text-[#8b949e] mt-1 block">Checking availability...</span>
              )}
              {usernameError && (
                <span className="text-[11px] text-[#da3633] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{usernameError}</span>
              )}
              {!usernameError && formData.username && formData.username !== user.username && !isCheckingUsername && (
                <span className="text-[11px] text-[#3fb950] mt-1 block">✓ Username available</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-1">Name</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1 text-sm focus:outline-none focus:border-[#58a6ff] text-[#c9d1d9]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-1">Bio</label>
              <textarea 
                value={formData.bio} 
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#58a6ff] text-[#c9d1d9] resize-y h-20 placeholder:text-[#8b949e]"
                placeholder="Add a bio"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-1">Company</label>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#8b949e] shrink-0" />
                <input 
                  type="text" 
                  value={formData.company} 
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1 text-sm focus:outline-none focus:border-[#58a6ff] text-[#c9d1d9]"
                  placeholder="Company"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-1">Location</label>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8b949e] shrink-0" />
                <input 
                  type="text" 
                  value={formData.location} 
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1 text-sm focus:outline-none focus:border-[#58a6ff] text-[#c9d1d9]"
                  placeholder="Location"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-1">Website</label>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#8b949e] shrink-0" />
                <input 
                  type="text" 
                  value={formData.website} 
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1 text-sm focus:outline-none focus:border-[#58a6ff] text-[#c9d1d9]"
                  placeholder="Website"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-1">X (formerly Twitter)</label>
              <div className="flex items-center gap-2">
                <Twitter className="w-4 h-4 text-[#8b949e] shrink-0" />
                <input 
                  type="text" 
                  value={formData.twitter} 
                  onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1 text-sm focus:outline-none focus:border-[#58a6ff] text-[#c9d1d9]"
                  placeholder="X username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-1">Avatar URL</label>
              <input 
                type="text" 
                value={formData.avatar} 
                onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1 text-sm focus:outline-none focus:border-[#58a6ff] text-[#c9d1d9]"
                placeholder="https://example.com/avatar.png"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={handleSave} className="bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold py-1.5 px-3 rounded-md transition border border-transparent">
                Save
              </button>
              <button onClick={handleCancel} className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-white text-sm font-medium py-1.5 px-3 rounded-md transition">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mb-4">
              <span className="block text-2xl font-bold text-[#f0f6fc]">{user.name}</span>
              <span className="block text-xl font-light text-[#8b949e]">{user.username}</span>
            </h1>

            {user.bio && <p className="text-sm text-[#c9d1d9] mb-4">{user.bio}</p>}

            <button onClick={() => setIsEditing(true)} className="w-full bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-white font-medium py-1.5 px-3 rounded-md transition mb-4 text-sm">
              Edit profile
            </button>

            <div className="flex items-center gap-1 text-sm mb-4 text-[#8b949e]">
              <Users className="w-4 h-4" />
              <button 
                type="button"
                onClick={() => { setModalTab('followers'); setUserListModalOpen(true); }}
                className="hover:text-[#58a6ff] flex items-center gap-1 transition cursor-pointer"
                title="View followers"
              >
                <span className="font-semibold text-[#c9d1d9] hover:text-[#58a6ff]">{user.followers_count ?? 0}</span>
                <span className="hover:underline">followers</span>
              </button>
              <span className="mx-1">·</span>
              <button 
                type="button"
                onClick={() => { setModalTab('following'); setUserListModalOpen(true); }}
                className="hover:text-[#58a6ff] flex items-center gap-1 transition cursor-pointer"
                title="View following"
              >
                <span className="font-semibold text-[#c9d1d9] hover:text-[#58a6ff]">{user.following_count ?? 0}</span>
                <span className="hover:underline">following</span>
              </button>
            </div>

            <ul className="text-sm space-y-2 text-[#c9d1d9]">
              {user.company && (
                <li className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#8b949e]" />
                  <span className="font-semibold">{user.company}</span>
                </li>
              )}
              {user.location && (
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#8b949e]" />
                  <span>{user.location}</span>
                </li>
              )}
              {user.website && (
                <li className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[#8b949e]" />
                  <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] hover:underline">
                    {user.website}
                  </a>
                </li>
              )}
              {user.twitter && (
                <li className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-[#8b949e]" />
                  <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] hover:underline">
                    @{user.twitter}
                  </a>
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="border-b border-[#30363d] mb-6">
          <nav className="flex gap-4 text-sm overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 py-3 px-2 border-b-2 font-semibold transition ${activeTab === 'overview' ? 'border-[#f78166] text-[#f0f6fc]' : 'border-transparent text-[#8b949e] hover:text-[#f0f6fc]'}`}
            >
              <Book className="w-4 h-4" />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('repositories')}
              className={`flex items-center gap-2 py-3 px-2 border-b-2 font-semibold transition ${activeTab === 'repositories' ? 'border-[#f78166] text-[#f0f6fc]' : 'border-transparent text-[#8b949e] hover:text-[#f0f6fc]'}`}
            >
              <span className="flex items-center gap-1.5"><GitMerge className="w-4 h-4" /> Repositories</span>
              <span className="bg-[#161b22] border border-[#30363d] text-xs font-semibold px-2 py-0.5 rounded-full">{repos.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab('stars')}
              className={`flex items-center gap-2 py-3 px-2 border-b-2 font-semibold transition ${activeTab === 'stars' ? 'border-[#f78166] text-[#f0f6fc]' : 'border-transparent text-[#8b949e] hover:text-[#f0f6fc]'}`}
            >
              <span className="flex items-center gap-1.5"><Star className="w-4 h-4" /> Stars</span>
              <span className="bg-[#161b22] border border-[#30363d] text-xs font-semibold px-2 py-0.5 rounded-full">{repos.reduce((acc, r) => acc + (r.stars_count || 0), 0)}</span>
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Special Profile README */}
            {specialRepo ? (
              <div className="mb-8 border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
                <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] text-xs font-medium text-[#c9d1d9] flex items-center gap-2">
                  <span className="text-[10px] bg-[#21262d] px-1.5 py-0.5 rounded border border-[#30363d] font-semibold">{user?.username || 'user'}</span>
                  / README.md
                </div>
                <div className="p-6 text-sm text-[#c9d1d9] prose prose-invert prose-sm max-w-none prose-a:text-[#58a6ff] prose-a:no-underline hover:prose-a:underline prose-headings:border-b prose-headings:border-[#30363d] prose-headings:pb-2 prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-[#30363d]">
                  {specialRepo.latest_prompt ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {specialRepo.latest_prompt}
                    </ReactMarkdown>
                  ) : (
                    <p>This is your special repository.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-8 border border-[#30363d] rounded-md p-4 bg-[#161b22] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#f0f6fc] mb-1">
                    {user?.username || 'user'} / {user?.username || 'user'} is a special repository
                  </h3>
                  <p className="text-xs text-[#8b949e]">
                    Its `README.md` will appear on your public profile!
                  </p>
                </div>
                {showGithubInput ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input 
                      type="text" 
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      placeholder="GitHub username or URL..."
                      className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] min-w-[200px]"
                      onKeyDown={(e) => e.key === 'Enter' && fetchGithubReadme()}
                    />
                    <button 
                      onClick={fetchGithubReadme}
                      disabled={isFetchingGithub || !githubUsername.trim()}
                      className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 whitespace-nowrap"
                    >
                      {isFetchingGithub ? "Fetching..." : "Fetch"}
                    </button>
                    <button 
                      onClick={() => setShowGithubInput(false)}
                      className="text-[#8b949e] hover:text-[#c9d1d9] text-xs px-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowGithubInput(true)}
                    className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#f0f6fc] text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition whitespace-nowrap"
                  >
                    <Book className="w-3.5 h-3.5" />
                    Fetch from GitHub
                  </button>
                )}
              </div>
            )}

            {/* Pinned Repos */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#f0f6fc] font-medium">Popular repositories</span>
              </div>
              
              {repos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {repos.slice(0, 6).map((repo) => (
                    <Link 
                      key={repo.id}
                      href={`/repo/${repo.id}`}
                      className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117] hover:border-[#8b949e]/50 transition group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Book className="w-4 h-4 text-[#8b949e]" />
                        <span className="text-sm font-semibold text-[#58a6ff] group-hover:underline">{repo.name}</span>
                        <span className="text-[10px] font-medium border border-[#30363d] text-[#8b949e] px-1.5 py-0.5 rounded-full">
                          {repo.visibility || 'Public'}
                        </span>
                      </div>
                      <p className="text-xs text-[#8b949e] mb-3 line-clamp-2">{repo.description || "Prompt repository"}</p>
                      <div className="flex items-center gap-3 text-[11px] text-[#8b949e]">
                        <div className="flex items-center gap-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            repo.category === 'Coding' ? 'bg-[#3178c6]' :
                            repo.category === 'Research' ? 'bg-[#238636]' :
                            repo.category === 'Writing' ? 'bg-[#a371f7]' :
                            repo.category === 'Education' ? 'bg-[#e3b341]' :
                            'bg-[#8b949e]'
                          }`}></span>
                          <span>{repo.category || 'Other'}</span>
                        </div>
                        <span className="font-mono">{repo.latest_version || 'v1.0'}</span>
                        <span>{repo.versions_count || 1} version{(repo.versions_count || 1) > 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-1 text-[#8b949e] ml-auto">
                          <Star className={`w-3 h-3 ${repo.is_starred ? 'text-[#e3b341] fill-[#e3b341]' : ''}`} />
                          <span>{repo.stars_count || 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border border-[#30363d] border-dashed rounded-md p-8 text-center bg-[#161b22]">
                  <h3 className="text-sm font-medium mb-2 text-[#f0f6fc]">No repositories yet.</h3>
                  <p className="text-xs text-[#8b949e] mb-4">Create your first prompt repository to get started!</p>
                  <Link href="/new" className="text-xs font-semibold text-[#58a6ff] hover:underline">Create a repository</Link>
                </div>
              )}
            </div>

            {/* Contribution Graph - REAL DATA */}
            <div>
              <h2 className="text-sm text-[#f0f6fc] mb-2">{totalContributions} contributions in the last year</h2>
              <div className="border border-[#30363d] rounded-md p-4 bg-[#0d1117]">
                {/* Month labels */}
                <div className="relative h-4 mb-1 pl-8">
                  {monthLabels.map(({ idx, label }, i) => (
                    <div 
                      key={i} 
                      className="absolute text-[10px] text-[#8b949e]"
                      style={{ left: `${32 + (idx * 13)}px` }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Heatmap Grid */}
                <div className="flex gap-[3px] overflow-x-auto no-scrollbar pb-2">
                  {/* Day labels */}
                  <div className="flex flex-col gap-[3px] pr-1 shrink-0">
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                      <div key={i} className="h-[10px] text-[9px] text-[#8b949e] flex items-center">{label}</div>
                    ))}
                  </div>
                  
                  {weeks.length > 0 ? (
                    weeks.map((week, col) => (
                      <div key={col} className="flex flex-col gap-[3px]">
                        {week.map((day, row) => (
                          <div
                            key={row}
                            className={`w-[10px] h-[10px] rounded-sm ${LEVEL_COLORS[day.level]} outline outline-1 outline-offset-[-1px] outline-white/5 cursor-pointer hover:outline-white/30 transition-all`}
                            title={`${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
                          />
                        ))}
                      </div>
                    ))
                  ) : (
                    // Fallback empty grid
                    Array.from({ length: 52 }).map((_, col) => (
                      <div key={col} className="flex flex-col gap-[3px]">
                        {Array.from({ length: 7 }).map((_, row) => (
                          <div key={row} className="w-[10px] h-[10px] rounded-sm bg-[#161b22] outline outline-1 outline-offset-[-1px] outline-white/5" />
                        ))}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[#8b949e] mt-2">
                  <div className="flex items-center gap-4">
                    <a href="#" className="hover:text-[#58a6ff]">Learn how we count contributions</a>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Less</span>
                    {LEVEL_COLORS.map((color, i) => (
                      <div key={i} className={`w-[10px] h-[10px] rounded-sm ${color}`} />
                    ))}
                    <span>More</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {contributions?.recent_activities && contributions.recent_activities.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm text-[#f0f6fc] mb-3 font-medium">Recent Activity</h2>
                <div className="space-y-2">
                  {contributions.recent_activities.slice(0, 8).map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs text-[#8b949e] py-2 border-b border-[#21262d]">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        activity.type === 'repo_created' ? 'bg-[#238636]/20 text-[#3fb950]' : 'bg-[#1f6feb]/20 text-[#58a6ff]'
                      }`}>
                        {activity.type === 'repo_created' ? (
                          <Book className="w-3 h-3" />
                        ) : (
                          <GitMerge className="w-3 h-3" />
                        )}
                      </div>
                      <div>
                        <p className="text-[#c9d1d9]">
                          {activity.type === 'repo_created' ? 'Created repository ' : 'Made a commit in '}
                          {activity.repo_name ? (
                            <Link href={`/repo/${activity.repo_id}`} className="text-[#58a6ff] hover:underline font-medium">
                              {user.username}/{activity.repo_name}
                            </Link>
                          ) : (
                            <span className="text-[#8b949e]">unknown repository</span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#8b949e] mt-0.5">
                          {activity.date ? (() => {
                            try {
                              const d = new Date(activity.date);
                              return isNaN(d.getTime()) ? '' : d.toLocaleString();
                            } catch { return ''; }
                          })() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Repositories Tab */}
        {activeTab === 'repositories' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <input 
                type="text" 
                placeholder="Find a repository..." 
                className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#c9d1d9] placeholder:text-[#8b949e] focus:outline-none focus:border-[#58a6ff] w-full max-w-sm"
              />
              <Link 
                href="/new"
                className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ml-3"
              >
                <Book className="w-3.5 h-3.5" />
                New
              </Link>
            </div>
            {repos.map((repo) => (
              <div key={repo.id} className="border-b border-[#21262d] pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/repo/${repo.id}`} className="text-[#58a6ff] hover:underline font-semibold text-base">
                        {repo.name}
                      </Link>
                      <span className="text-[10px] font-medium border border-[#30363d] text-[#8b949e] px-1.5 py-0.5 rounded-full">
                        {repo.visibility || 'Public'}
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e] mb-2 max-w-lg">{repo.description || "Prompt repository"}</p>
                    <div className="flex items-center gap-4 text-xs text-[#8b949e]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          repo.category === 'Coding' ? 'bg-[#3178c6]' :
                          repo.category === 'Research' ? 'bg-[#238636]' :
                          repo.category === 'Writing' ? 'bg-[#a371f7]' :
                          repo.category === 'Education' ? 'bg-[#e3b341]' :
                          'bg-[#8b949e]'
                        }`}></span>
                        <span>{repo.category || 'Other'}</span>
                      </div>
                      <span>Updated {repo.updated_at ? (() => {
                        try {
                          const d = new Date(repo.updated_at);
                          return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
                        } catch { return ''; }
                      })() : ''}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleToggleStar(e, repo.id)}
                    className={`border text-xs font-semibold px-3 py-1 rounded-md flex items-center gap-1.5 transition ${
                      repo.is_starred
                        ? 'bg-[#e3b341]/10 border-[#e3b341]/50 text-[#e3b341]'
                        : 'bg-[#21262d] hover:bg-[#30363d] border-[#363b42] text-[#c9d1d9]'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${repo.is_starred ? 'text-[#e3b341] fill-[#e3b341]' : 'text-[#8b949e]'}`} />
                    <span>{repo.is_starred ? 'Starred' : 'Star'}</span>
                    <span className="bg-[#30363d] px-1.5 py-0.2 rounded-full text-[10px] text-[#f0f6fc]">
                      {repo.stars_count || 0}
                    </span>
                  </button>
                </div>
              </div>
            ))}
            {repos.length === 0 && (
              <div className="text-center py-12 text-[#8b949e]">
                <p className="text-sm mb-2">You don't have any repositories yet.</p>
                <Link href="/new" className="text-[#58a6ff] hover:underline text-sm font-semibold">Create your first repository</Link>
              </div>
            )}
          </div>
        )}

        {/* Stars Tab */}
        {activeTab === 'stars' && (
          <div className="text-center py-12 text-[#8b949e]">
            <Star className="w-8 h-8 mx-auto mb-3 text-[#30363d]" />
            <p className="text-sm mb-2">You haven't starred any repositories yet.</p>
            <Link href="/explore" className="text-[#58a6ff] hover:underline text-sm font-semibold">Explore repositories</Link>
          </div>
        )}
      </div>

      {/* AI Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
              <h2 className="text-[#f0f6fc] text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#58a6ff]" />
                Preview Profile README
              </h2>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <label className="block text-sm font-semibold text-[#f0f6fc] mb-2">Edit your fetched README:</label>
              <textarea
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-sm text-[#c9d1d9] font-mono focus:outline-none focus:border-[#58a6ff] transition"
                rows={12}
              />
            </div>
            
            <div className="p-4 border-t border-[#30363d] flex justify-end gap-2 bg-[#161b22]">
              <button 
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[#c9d1d9] bg-[#21262d] border border-[#363b42] hover:bg-[#30363d] rounded-md transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmCreateSpecialRepo}
                disabled={isCreatingSpecial}
                className="px-4 py-2 text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 rounded-md transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isCreatingSpecial ? "Creating..." : "Looks good, create repo!"}
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
