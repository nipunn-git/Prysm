"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  GitFork, 
  Copy, 
  Check, 
  Heart,
  Sparkles,
  Loader2, 
  Users,
  ChevronDown,
  Clock,
  Flame,
  Tag,
  ArrowRight,
  Lock,
  Globe
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { addCreatedRepoId, saveForkInfo } from "../../lib/repoStore";
import { API_URL } from "../../lib/api";
import { getCachedData, setCachedData, cacheUser, cacheUsers } from "../../lib/cache";
import { GridPulse } from "@/components/ui/grid-pulse";

function formatPostDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function ExploreContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Instant pre-cached hydration baseline for 0ms perceptible loading
  const [repos, setRepos] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('explore_all_repos');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('explore_all_repos');
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });

  const [suggestedUsers, setSuggestedUsers] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('explore_suggested_users');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  // Filter Dropdown States
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "oldest"
  const [popularFilter, setPopularFilter] = useState("all"); // "all" | "most_liked" | "trending"
  const [category, setCategory] = useState("All");
  const [openDropdown, setOpenDropdown] = useState(null); // "time" | "popular" | "category" | null

  const filterRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [copiedId, setCopiedId] = useState(null);
  const [forkingId, setForkingId] = useState(null);
  const [forkModalRepo, setForkModalRepo] = useState(null);
  const [forkVisibility, setForkVisibility] = useState("Private");
  const [forkRepoName, setForkRepoName] = useState("");
  const [followingMap, setFollowingMap] = useState({});

  // Fetch suggested creators for in-feed suggested section
  useEffect(() => {
    async function fetchSuggested() {
      try {
        const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
        const res = await fetch(`${API_URL}/api/auth/users/suggested${storedToken ? `?token=${encodeURIComponent(storedToken)}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setSuggestedUsers(list);
          setCachedData('explore_suggested_users', list);
          cacheUsers(list);
          const fMap = {};
          list.forEach(u => {
            fMap[u.id] = Boolean(u.is_following);
          });
          setFollowingMap(prev => ({ ...prev, ...fMap }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchSuggested();
  }, [user?.id]);

  // Filter out creators the user already follows and themselves (Apple/Insta clean suggestions)
  const unFollowedSuggestedUsers = useMemo(() => {
    return suggestedUsers.filter(u => {
      if (user?.id && u.id === user.id) return false;
      if (followingMap[u.id] === true) return false;
      if (u.is_following) return false;
      return true;
    });
  }, [suggestedUsers, followingMap, user?.id]);

  // Fetch fresh public feed from backend smoothly in background
  useEffect(() => {
    async function fetchData() {
      try {
        const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
        const queryParams = new URLSearchParams();
        if (category !== "All") queryParams.append("category", category);
        if (user?.id) queryParams.append("user_id", user.id);
        if (storedToken) queryParams.append("token", storedToken);
        
        const res = await fetch(`${API_URL}/api/repositories/explore?${queryParams.toString()}`);
        if (res && res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setRepos(list);
          cacheUsers(list.map(r => r.owner).filter(Boolean));
          if (category === "All") {
            setCachedData('explore_all_repos', list);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [category, user?.id]);

  // Client-Side Instant Filtering and Sorting (0ms Latency)
  const displayedRepos = useMemo(() => {
    let list = [...repos];

    // 1. Category Filter
    if (category && category !== "All") {
      list = list.filter(r => (r.category || "").toLowerCase() === category.toLowerCase());
    }

    // 2. Popularity / Time Sorting
    if (popularFilter === "most_liked") {
      list.sort((a, b) => (b.stars_count || 0) - (a.stars_count || 0));
    } else if (popularFilter === "trending") {
      list.sort((a, b) => {
        const scoreA = (a.stars_count || 0) * 3 + new Date(a.created_at).getTime() / 1e11;
        const scoreB = (b.stars_count || 0) * 3 + new Date(b.created_at).getTime() / 1e11;
        return scoreB - scoreA;
      });
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      // Default newest first
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [repos, category, popularFilter, sortBy]);

  const handleCopyPrompt = (e, promptText, id) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(promptText || "");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStar = async (e, repoId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const res = await fetch(`${API_URL}/api/repositories/${repoId}/star${storedToken ? `?token=${encodeURIComponent(storedToken)}` : ''}`, {
        method: 'POST',
        headers: storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setRepos(prev => prev.map(r => r.id === repoId ? { ...r, is_starred: data.starred, stars_count: data.stars_count } : r));
      }
    } catch (e) {
      console.error("Star error:", e);
    }
  };

  const handleToggleFollow = async (e, targetUserId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const headers = {
        ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
        ...(user?.id ? { 'X-User-Id': user.id } : {})
      };
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (user?.id) queryParams.set('user_id', user.id);

      const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(targetUserId)}/follow?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setFollowingMap(prev => ({ ...prev, [targetUserId]: data.following }));
        setSuggestedUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, is_following: data.following, followers_count: data.followers_count } : u));
      }
    } catch (e) {
      console.error("Follow error:", e);
    }
  };

  const openForkModal = (e, repo) => {
    e.preventDefault();
    e.stopPropagation();
    setForkModalRepo(repo);
    setForkRepoName(repo.name);
    setForkVisibility("Private");
  };

  const handleExecuteFork = async () => {
    if (!forkModalRepo) return;
    setForkingId(forkModalRepo.id);
    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      const queryParams = new URLSearchParams();
      if (effectiveUserId) queryParams.append('user_id', effectiveUserId);
      if (storedToken) queryParams.append('token', storedToken);

      const headers = { "Content-Type": "application/json" };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`${API_URL}/api/repositories?${queryParams.toString()}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: forkRepoName.trim() || forkModalRepo.name,
          description: `Forked from ${forkModalRepo.owner_name || 'community'}/${forkModalRepo.name}. ${forkModalRepo.description || ''}`,
          category: forkModalRepo.category || "Other",
          visibility: forkVisibility,
          initial_prompt: forkModalRepo.latest_prompt || "Forked prompt instructions."
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to fork repository");
      }

      const newRepo = await res.json();
      addCreatedRepoId(newRepo.id);
      saveForkInfo(newRepo.id, forkModalRepo);
      setForkModalRepo(null);
      router.push(`/repo/${newRepo.id}`);
    } catch (e) {
      console.error("Fork error:", e);
      alert(e.message || "Failed to fork repository.");
    } finally {
      setForkingId(null);
    }
  };

  const categories = ["All", "Coding", "Research", "Education", "Writing", "Productivity", "Other"];

  return (
    <div className={`min-h-[calc(100vh-64px)] relative overflow-x-hidden transition-colors duration-300 font-apple pb-28 ${
      isDark ? "bg-[#05070c] text-[#f5f5f7]" : "bg-[#f8fafc] text-[#1d1d1f]"
    }`}>
      {/* Background Interactive Canvas GridPulse (Exact same as Prysm AI Dashboard) */}
      <GridPulse cell={28} reach={2.8} ambient={3} className="opacity-35 dark:opacity-20 pointer-events-none fixed inset-0 z-0" />

      {/* Main Apple-Style Glassmorphic Feed Stream Container */}
      <div className="relative z-10 max-w-2xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 font-apple">
        
        <div className={`rounded-3xl border transition-all duration-300 shadow-2xl overflow-hidden relative ${
          isDark 
            ? "bg-[#090b10]/65 backdrop-blur-3xl border-white/[0.12] shadow-[0_25px_70px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)]" 
            : "bg-white/65 backdrop-blur-3xl border-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)]"
        }`}>

          {/* Minimal Glass Filter Header Bar with 3 Dropdowns */}
          <div 
            ref={filterRef}
            className={`px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-2xl transition-colors ${
              isDark ? "bg-[#090b10]/70 border-white/[0.08]" : "bg-white/65 border-black/[0.05]"
            }`}
          >
            {/* Left Title Label */}
            <div className="flex items-center gap-2 select-none">
              <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#2997ff] shadow-[0_0_8px_#2997ff]' : 'bg-[#0071e3] shadow-[0_0_8px_#0071e3]'}`} />
              <span className={`text-xs font-bold tracking-tight uppercase ${isDark ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                Feed
              </span>
            </div>

            {/* Right: 3 Sleek Apple-Style Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* 1. Time / Date Sort Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(prev => prev === "time" ? null : "time")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer backdrop-blur-md ${
                    sortBy !== "newest"
                      ? isDark
                        ? "bg-[#2997ff]/15 border-[#2997ff]/40 text-[#2997ff]"
                        : "bg-blue-50/90 border-[#0071e3]/30 text-[#0071e3]"
                      : isDark
                        ? "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.12] text-[#f5f5f7]"
                        : "bg-white/70 hover:bg-white/95 border-black/[0.08] text-[#1d1d1f] shadow-sm"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 opacity-75" />
                  <span>{sortBy === "newest" ? "Latest" : "Oldest"}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === "time" ? "rotate-180" : ""}`} />
                </button>

                {openDropdown === "time" && (
                  <div className={`absolute right-0 mt-1.5 w-36 rounded-2xl border p-1.5 shadow-2xl z-30 animate-fadeIn backdrop-blur-2xl ${
                    isDark ? "bg-[#12141a]/90 border-white/[0.15] text-[#f5f5f7]" : "bg-white/90 border-black/[0.08] text-[#1d1d1f] shadow-xl"
                  }`}>
                    <button
                      onClick={() => { setSortBy("newest"); setOpenDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                        sortBy === "newest" 
                          ? isDark ? "bg-[#2997ff]/20 text-[#2997ff] font-semibold" : "bg-blue-50 text-[#0071e3] font-semibold"
                          : isDark ? "hover:bg-white/5" : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <span>Newest first</span>
                      {sortBy === "newest" && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => { setSortBy("oldest"); setOpenDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                        sortBy === "oldest" 
                          ? isDark ? "bg-[#2997ff]/20 text-[#2997ff] font-semibold" : "bg-blue-50 text-[#0071e3] font-semibold"
                          : isDark ? "hover:bg-white/5" : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <span>Oldest first</span>
                      {sortBy === "oldest" && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Popularity / Most Famous Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(prev => prev === "popular" ? null : "popular")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer backdrop-blur-md ${
                    popularFilter !== "all"
                      ? isDark
                        ? "bg-[#2997ff]/15 border-[#2997ff]/40 text-[#2997ff]"
                        : "bg-blue-50/90 border-[#0071e3]/30 text-[#0071e3]"
                      : isDark
                        ? "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.12] text-[#f5f5f7]"
                        : "bg-white/70 hover:bg-white/95 border-black/[0.08] text-[#1d1d1f] shadow-sm"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {popularFilter === "all" ? "Popularity" : popularFilter === "most_liked" ? "Most Liked" : "Trending"}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === "popular" ? "rotate-180" : ""}`} />
                </button>

                {openDropdown === "popular" && (
                  <div className={`absolute right-0 mt-1.5 w-40 rounded-2xl border p-1.5 shadow-2xl z-30 animate-fadeIn backdrop-blur-2xl ${
                    isDark ? "bg-[#12141a]/90 border-white/[0.15] text-[#f5f5f7]" : "bg-white/90 border-black/[0.08] text-[#1d1d1f] shadow-xl"
                  }`}>
                    <button
                      onClick={() => { setPopularFilter("all"); setOpenDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                        popularFilter === "all" 
                          ? isDark ? "bg-[#2997ff]/20 text-[#2997ff] font-semibold" : "bg-blue-50 text-[#0071e3] font-semibold"
                          : isDark ? "hover:bg-white/5" : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <span>Default</span>
                      {popularFilter === "all" && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => { setPopularFilter("most_liked"); setOpenDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                        popularFilter === "most_liked" 
                          ? isDark ? "bg-[#2997ff]/20 text-[#2997ff] font-semibold" : "bg-blue-50 text-[#0071e3] font-semibold"
                          : isDark ? "hover:bg-white/5" : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <span>Most Liked</span>
                      {popularFilter === "most_liked" && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => { setPopularFilter("trending"); setOpenDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                        popularFilter === "trending" 
                          ? isDark ? "bg-[#2997ff]/20 text-[#2997ff] font-semibold" : "bg-blue-50 text-[#0071e3] font-semibold"
                          : isDark ? "hover:bg-white/5" : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <span>Trending</span>
                      {popularFilter === "trending" && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Category Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(prev => prev === "category" ? null : "category")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer backdrop-blur-md ${
                    category !== "All"
                      ? isDark
                        ? "bg-[#2997ff]/15 border-[#2997ff]/40 text-[#2997ff]"
                        : "bg-blue-50/90 border-[#0071e3]/30 text-[#0071e3]"
                      : isDark
                        ? "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.12] text-[#f5f5f7]"
                        : "bg-white/70 hover:bg-white/95 border-black/[0.08] text-[#1d1d1f] shadow-sm"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 opacity-75" />
                  <span>{category === "All" ? "Category" : category}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === "category" ? "rotate-180" : ""}`} />
                </button>

                {openDropdown === "category" && (
                  <div className={`absolute right-0 mt-1.5 w-44 rounded-2xl border p-1.5 shadow-2xl z-30 animate-fadeIn backdrop-blur-2xl ${
                    isDark ? "bg-[#12141a]/90 border-white/[0.15] text-[#f5f5f7]" : "bg-white/90 border-black/[0.08] text-[#1d1d1f] shadow-xl"
                  }`}>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); setOpenDropdown(null); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                          category === cat 
                            ? isDark ? "bg-[#2997ff]/20 text-[#2997ff] font-semibold" : "bg-blue-50 text-[#0071e3] font-semibold"
                            : isDark ? "hover:bg-white/5" : "hover:bg-black/[0.04]"
                        }`}
                      >
                        <span>{cat === "All" ? "All Categories" : cat}</span>
                        {category === cat && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Continuous Stream Feed (Instagram-style seamless list with Apple typography) */}
          <div className="divide-y divide-transparent">
            {loading && repos.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center">
                <Loader2 className={`w-7 h-7 animate-spin mb-3 ${isDark ? 'text-[#2997ff]' : 'text-[#0071e3]'}`} />
                <span className={`text-xs font-medium ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>Loading feed...</span>
              </div>
            ) : displayedRepos.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center px-4">
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-3 ${
                  isDark ? 'bg-white/5 border-white/10 text-[#86868b]' : 'bg-black/[0.03] border-black/[0.06] text-[#86868b]'
                }`}>
                  <Tag className="w-5 h-5" />
                </div>
                <p className={`text-sm font-semibold mb-1 tracking-tight ${isDark ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                  No prompts found in {category === "All" ? "feed" : category}
                </p>
                <p className={`text-xs max-w-sm ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                  Try clearing your filters or select a different category above.
                </p>
                {category !== "All" && (
                  <button
                    onClick={() => { setCategory("All"); setPopularFilter("all"); setSortBy("newest"); }}
                    className={`mt-4 text-xs font-semibold px-3 py-1.5 rounded-full border transition cursor-pointer ${
                      isDark 
                        ? 'bg-[#2997ff]/15 border-[#2997ff]/40 text-[#2997ff] hover:bg-[#2997ff]/25' 
                        : 'bg-blue-50 border-[#0071e3]/30 text-[#0071e3] hover:bg-blue-100'
                    }`}
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              <div>
                {displayedRepos.map((repo, idx) => {
                  // In-feed "Suggested for You" after post index 2 (between post 3 & 4)
                  const isSuggestedPosition = idx === 2;

                  return (
                    <div key={repo.id}>
                      {/* The Seamless Post Item */}
                      <article className={`p-4 sm:p-6 border-b transition-colors ${
                        isDark 
                          ? "border-white/[0.08] hover:bg-white/[0.015]" 
                          : "border-black/[0.04] hover:bg-black/[0.015]"
                      }`}>
                        {/* Post Header: Avatar, Name, Handle, Date, Category Tag */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <Link 
                            href={`/u/${repo.owner_username}`}
                            onClick={() => {
                              if (repo.owner) cacheUser(repo.owner);
                              else if (repo.owner_username) {
                                cacheUser({
                                  id: repo.owner_id,
                                  username: repo.owner_username,
                                  name: repo.owner_name,
                                  avatar: repo.owner_avatar
                                });
                              }
                            }}
                            className="flex items-center gap-3 min-w-0 group/author"
                          >
                            <img 
                              src={repo.owner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner_name}`} 
                              alt={repo.owner_name} 
                              className={`w-10 h-10 rounded-full border object-cover shrink-0 shadow-sm ${
                                isDark ? 'border-white/15' : 'border-black/[0.08]'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-semibold text-xs sm:text-sm transition truncate tracking-tight ${
                                  isDark ? 'text-[#f5f5f7] group-hover/author:text-[#2997ff]' : 'text-[#1d1d1f] group-hover/author:text-[#0071e3]'
                                }`}>
                                  {repo.owner_name}
                                </span>
                                <span className={`text-xs truncate ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                                  @{repo.owner_username}
                                </span>
                                <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>·</span>
                                <span className={`text-xs ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                                  {formatPostDate(repo.created_at)}
                                </span>
                              </div>
                              {repo.category && (
                                <div className="mt-0.5">
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border tracking-wide ${
                                    isDark ? 'bg-white/[0.05] border-white/[0.08] text-[#86868b]' : 'bg-black/[0.03] border-black/[0.06] text-[#86868b]'
                                  }`}>
                                    #{repo.category}
                                  </span>
                                </div>
                              )}
                            </div>
                          </Link>

                          {/* Top-Right Quick Fork Pill */}
                          <button
                            onClick={(e) => openForkModal(e, repo)}
                            title="Fork repository"
                            className={`text-xs font-medium px-2.5 py-1 rounded-xl border transition flex items-center gap-1.5 shrink-0 cursor-pointer backdrop-blur-md ${
                              isDark 
                                ? 'border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-[#f5f5f7]' 
                                : 'border-black/[0.06] bg-black/[0.03] hover:bg-black/[0.06] text-[#1d1d1f]'
                            }`}
                          >
                            <GitFork className={`w-3.5 h-3.5 ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`} />
                            <span>Fork</span>
                          </button>
                        </div>

                        {/* Prompt Title & Description */}
                        <div 
                          onClick={() => router.push(`/repo/${repo.id}`)}
                          className="cursor-pointer mb-3"
                        >
                          <h2 className={`text-sm sm:text-base font-semibold transition mb-1 leading-snug tracking-tight ${
                            isDark ? 'text-[#f5f5f7] hover:text-[#2997ff]' : 'text-[#1d1d1f] hover:text-[#0071e3]'
                          }`}>
                            {repo.name}
                          </h2>
                          {repo.description && (
                            <p className={`text-xs sm:text-[13px] leading-relaxed ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                              {repo.description}
                            </p>
                          )}
                        </div>

                        {/* Prompt Content Preview Box with Frosted Glass */}
                        <div className={`relative group/code rounded-2xl border p-3.5 sm:p-4 mb-3 transition-all backdrop-blur-md ${
                          isDark 
                            ? 'bg-black/35 border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]' 
                            : 'bg-black/[0.025] border-black/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]'
                        }`}>
                          <button
                            onClick={(e) => handleCopyPrompt(e, repo.latest_prompt, repo.id)}
                            className={`absolute top-2.5 right-2.5 p-1.5 border rounded-lg opacity-0 group-hover/code:opacity-100 transition-opacity z-10 cursor-pointer backdrop-blur-md ${
                              isDark 
                                ? 'bg-white/10 border-white/15 text-[#86868b] hover:text-white hover:bg-white/20' 
                                : 'bg-white/90 border-black/[0.08] text-[#86868b] hover:text-[#1d1d1f] hover:bg-white shadow-sm'
                            }`}
                            title="Copy prompt"
                          >
                            {copiedId === repo.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <pre className={`text-xs sm:text-[13px] font-apple-mono line-clamp-5 whitespace-pre-wrap leading-[1.65] select-all ${
                            isDark ? 'text-slate-300' : 'text-[#1d1d1f]'
                          }`}>
                            {repo.latest_prompt}
                          </pre>
                        </div>

                        {/* Social Action Footer: Like (Heart), Copy, Optimize, View Versions */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-4 sm:gap-6">
                            {/* Like (Heart) - Instagram Style with Apple touch */}
                            <button
                              onClick={(e) => handleToggleStar(e, repo.id)}
                              title={repo.is_starred ? "Unlike" : "Like"}
                              className="flex items-center gap-1.5 transition group cursor-pointer"
                            >
                              <Heart 
                                className={`w-4 h-4 transition-all duration-200 ${
                                  repo.is_starred 
                                    ? "fill-[#ff2d55] text-[#ff2d55] stroke-[#ff2d55] scale-110" 
                                    : isDark
                                      ? "text-[#86868b] group-hover:text-[#ff375f] group-hover:scale-110 stroke-[1.8]"
                                      : "text-[#86868b] group-hover:text-[#ff2d55] group-hover:scale-110 stroke-[1.8]"
                                }`} 
                              />
                              <span className={`font-semibold ${
                                repo.is_starred 
                                  ? "text-[#ff2d55]" 
                                  : isDark ? "text-[#86868b] group-hover:text-[#f5f5f7]" : "text-[#86868b] group-hover:text-[#1d1d1f]"
                              }`}>
                                {repo.stars_count || 0}
                              </span>
                            </button>

                            {/* Quick Copy */}
                            <button
                              onClick={(e) => handleCopyPrompt(e, repo.latest_prompt, repo.id)}
                              title="Copy prompt"
                              className={`flex items-center gap-1.5 transition cursor-pointer font-medium ${
                                isDark ? 'text-[#86868b] hover:text-[#f5f5f7]' : 'text-[#86868b] hover:text-[#1d1d1f]'
                              }`}
                            >
                              {copiedId === repo.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Optimize (Prysm AI Studio) */}
                            <button
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  sessionStorage.setItem('optimize_prompt', repo.latest_prompt || '');
                                  router.push('/dashboard');
                                }
                              }}
                              title="Optimize in Prysm AI Studio"
                              className={`flex items-center gap-1.5 transition cursor-pointer font-medium ${
                                isDark ? 'text-[#2997ff] hover:text-[#67b5ff]' : 'text-[#0071e3] hover:text-[#0077ed]'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Optimize</span>
                            </button>
                          </div>

                          {/* View Versions Link */}
                          <Link
                            href={`/repo/${repo.id}`}
                            className={`text-xs font-medium transition flex items-center gap-1 ${
                              isDark ? 'text-[#86868b] hover:text-[#2997ff]' : 'text-[#86868b] hover:text-[#0071e3]'
                            }`}
                          >
                            <span>View versions</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </article>

                      {/* In-feed "Suggested for You" Section (Instagram Style - ONLY Unfollowed Creators!) */}
                      {isSuggestedPosition && unFollowedSuggestedUsers.length > 0 && (
                        <section className={`p-4 sm:p-5 border-b my-0.5 transition-colors ${
                          isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-black/[0.04] bg-black/[0.01]'
                        }`}>
                          <div className="flex items-center justify-between mb-3.5 px-1">
                            <div className="flex items-center gap-2">
                              <Users className={`w-3.5 h-3.5 ${isDark ? 'text-[#2997ff]' : 'text-[#0071e3]'}`} />
                              <h3 className={`text-xs font-semibold tracking-tight ${isDark ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                                Suggested for You
                              </h3>
                            </div>
                            <span className={`text-[11px] font-medium ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                              Top Creators
                            </span>
                          </div>

                          {/* Horizontal Scrollable Creator Cards */}
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
                            {unFollowedSuggestedUsers.map(u => (
                              <div 
                                key={u.id}
                                className={`min-w-[155px] max-w-[170px] p-3.5 rounded-2xl border flex flex-col items-center text-center shrink-0 transition-all duration-200 backdrop-blur-xl group ${
                                  isDark 
                                    ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]' 
                                    : 'bg-white/70 border-black/[0.06] hover:bg-white/95 hover:border-black/[0.12] shadow-sm hover:shadow-md'
                                }`}
                              >
                                <Link 
                                  href={`/u/${u.username}`} 
                                  onClick={() => cacheUser(u)}
                                  className="flex flex-col items-center w-full"
                                >
                                  <img 
                                    src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                                    alt={u.username}
                                    className={`w-12 h-12 rounded-full border object-cover mb-2 shadow-sm ${
                                      isDark ? 'border-white/15' : 'border-black/[0.08]'
                                    }`}
                                  />
                                  <span className={`font-semibold text-xs truncate w-full transition tracking-tight ${
                                    isDark ? 'text-[#f5f5f7] group-hover:text-[#2997ff]' : 'text-[#1d1d1f] group-hover:text-[#0071e3]'
                                  }`}>
                                    {u.name}
                                  </span>
                                  <span className={`text-[11px] truncate w-full mb-1 ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                                    @{u.username}
                                  </span>
                                  <span className={`text-[10px] mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {u.repos_count || 0} prompts
                                  </span>
                                </Link>

                                <button
                                  onClick={(e) => handleToggleFollow(e, u.id)}
                                  className={`w-full text-xs font-semibold py-1.5 px-2 rounded-xl transition shrink-0 cursor-pointer ${
                                    followingMap[u.id]
                                      ? isDark 
                                        ? "bg-white/10 text-[#86868b] border border-white/10 hover:bg-red-950/40 hover:text-red-400" 
                                        : "bg-black/[0.05] text-[#86868b] border border-black/[0.08] hover:bg-red-50 hover:text-red-600"
                                      : isDark
                                        ? "bg-[#2997ff] hover:bg-[#0071e3] text-white shadow-sm"
                                        : "bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm"
                                  }`}
                                >
                                  {followingMap[u.id] ? "Following" : "Follow"}
                                </button>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  );
                })}

                {/* In case there are fewer than 3 posts, still display Suggested for You at bottom if unfollowed exist */}
                {displayedRepos.length > 0 && displayedRepos.length < 3 && unFollowedSuggestedUsers.length > 0 && (
                  <section className={`p-4 sm:p-5 border-b my-0.5 transition-colors ${
                    isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-black/[0.04] bg-black/[0.01]'
                  }`}>
                    <div className="flex items-center justify-between mb-3.5 px-1">
                      <div className="flex items-center gap-2">
                        <Users className={`w-3.5 h-3.5 ${isDark ? 'text-[#2997ff]' : 'text-[#0071e3]'}`} />
                        <h3 className={`text-xs font-semibold tracking-tight ${isDark ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                          Suggested for You
                        </h3>
                      </div>
                      <span className={`text-[11px] font-medium ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                        Top Creators
                      </span>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
                      {unFollowedSuggestedUsers.map(u => (
                        <div 
                          key={u.id}
                          className={`min-w-[155px] max-w-[170px] p-3.5 rounded-2xl border flex flex-col items-center text-center shrink-0 transition-all duration-200 backdrop-blur-xl group ${
                            isDark 
                              ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]' 
                              : 'bg-white/70 border-black/[0.06] hover:bg-white/95 hover:border-black/[0.12] shadow-sm hover:shadow-md'
                          }`}
                        >
                          <Link 
                            href={`/u/${u.username}`} 
                            onClick={() => cacheUser(u)}
                            className="flex flex-col items-center w-full"
                          >
                            <img 
                              src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                              alt={u.username}
                              className={`w-12 h-12 rounded-full border object-cover mb-2 shadow-sm ${
                                isDark ? 'border-white/15' : 'border-black/[0.08]'
                              }`}
                            />
                            <span className={`font-semibold text-xs truncate w-full transition tracking-tight ${
                              isDark ? 'text-[#f5f5f7] group-hover:text-[#2997ff]' : 'text-[#1d1d1f] group-hover:text-[#0071e3]'
                            }`}>
                              {u.name}
                            </span>
                            <span className={`text-[11px] truncate w-full mb-1 ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                              @{u.username}
                            </span>
                            <span className={`text-[10px] mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {u.repos_count || 0} prompts
                            </span>
                          </Link>

                          <button
                            onClick={(e) => handleToggleFollow(e, u.id)}
                            className={`w-full text-xs font-semibold py-1.5 px-2 rounded-xl transition shrink-0 cursor-pointer ${
                              followingMap[u.id]
                                ? isDark 
                                  ? "bg-white/10 text-[#86868b] border border-white/10 hover:bg-red-950/40 hover:text-red-400" 
                                  : "bg-black/[0.05] text-[#86868b] border border-black/[0.08] hover:bg-red-50 hover:text-red-600"
                                : isDark
                                  ? "bg-[#2997ff] hover:bg-[#0071e3] text-white shadow-sm"
                                  : "bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm"
                            }`}
                          >
                            {followingMap[u.id] ? "Following" : "Follow"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Fork Modal with Apple-Style Glass Dialog */}
      {forkModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl relative transition-all backdrop-blur-3xl font-apple ${
            isDark ? "bg-[#12141a]/90 border-white/[0.15] text-[#f5f5f7]" : "bg-white/90 border-black/[0.08] text-[#1d1d1f]"
          }`}>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2 tracking-tight">
              <GitFork className={`w-5 h-5 ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`} />
              Fork Repository
            </h2>
            <p className={`text-xs mb-5 ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
              Clone a copy of <span className="font-semibold text-[#0071e3] dark:text-[#2997ff]">@{forkModalRepo.owner_username || forkModalRepo.owner_name}</span>&apos;s prompt into your workspace.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold mb-1.5 tracking-tight">Repository Name</label>
                <input
                  type="text"
                  value={forkRepoName}
                  onChange={(e) => setForkRepoName(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-all ${
                    isDark 
                      ? "bg-black/40 border-white/15 text-white focus:border-[#2997ff]" 
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#0071e3]"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 tracking-tight">Visibility</label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 cursor-pointer text-xs font-medium ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="fork_vis"
                      value="Private"
                      checked={forkVisibility === "Private"}
                      onChange={() => setForkVisibility("Private")}
                      className="accent-[#0071e3] dark:accent-[#2997ff]"
                    />
                    <Lock className="w-3.5 h-3.5" /> Private
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer text-xs font-medium ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="fork_vis"
                      value="Public"
                      checked={forkVisibility === "Public"}
                      onChange={() => setForkVisibility("Public")}
                      className="accent-[#0071e3] dark:accent-[#2997ff]"
                    />
                    <Globe className="w-3.5 h-3.5" /> Public
                  </label>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
              isDark ? 'border-white/[0.08]' : 'border-black/[0.05]'
            }`}>
              <button
                onClick={() => setForkModalRepo(null)}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer ${
                  isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteFork}
                disabled={forkingId !== null}
                className="bg-[#0071e3] dark:bg-[#2997ff] hover:opacity-90 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {forkingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Forking...
                  </>
                ) : (
                  <>
                    <GitFork className="w-4 h-4" />
                    Fork
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3] dark:text-[#2997ff]" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
