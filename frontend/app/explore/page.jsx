"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  GitFork, 
  Copy, 
  Check, 
  Heart,
  Sparkles,
  Loader2, 
  Users,
  X,
  ArrowRight,
  Lock,
  Globe
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { addCreatedRepoId, saveForkInfo } from "../../lib/repoStore";
import { API_URL } from "../../lib/api";
import { getCachedData, setCachedData, cacheUser, cacheUsers, searchCachedUsers } from "../../lib/cache";

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
  const searchParams = useSearchParams();
  const urlSearch = searchParams ? (searchParams.get("search") || "") : "";
  const { user } = useAuth();

  // Explore state - clean SSR baseline to prevent hydration mismatch
  const [repos, setRepos] = useState([]);
  const [users, setUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");

  // Sync cached data on mount
  useEffect(() => {
    const cachedRepos = getCachedData('explore_all_repos', []);
    if (cachedRepos && cachedRepos.length > 0) {
      setRepos(cachedRepos);
      setLoading(false);
    }
    const cachedSuggested = getCachedData('explore_suggested_users', []);
    if (cachedSuggested && cachedSuggested.length > 0) {
      setSuggestedUsers(cachedSuggested);
    }
  }, []);

  const [search, setSearch] = useState(urlSearch);
  const [copiedId, setCopiedId] = useState(null);
  const [forkingId, setForkingId] = useState(null);
  const [forkModalRepo, setForkModalRepo] = useState(null);
  const [forkVisibility, setForkVisibility] = useState("Private");
  const [forkRepoName, setForkRepoName] = useState("");
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    if (urlSearch && urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  // Fetch suggested creators for in-feed suggested section
  useEffect(() => {
    async function fetchSuggested() {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
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

  // Instant 0ms pre-match for creators across cached users
  useEffect(() => {
    if (search.trim()) {
      const localMatches = searchCachedUsers(search.trim());
      if (localMatches.length > 0) {
        setUsers(localMatches);
      }
    } else {
      setUsers([]);
    }
  }, [search]);

  useEffect(() => {
    async function fetchData() {
      if (repos.length === 0) setLoading(true);
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
        const queryParams = new URLSearchParams();
        if (category !== "All") queryParams.append("category", category);
        if (search) queryParams.append("search", search);
        if (user?.id) queryParams.append("user_id", user.id);
        if (storedToken) queryParams.append("token", storedToken);
        
        const [res, usersRes] = await Promise.all([
          fetch(`${API_URL}/api/repositories/explore?${queryParams.toString()}`),
          search.trim()
            ? fetch(`${API_URL}/api/auth/users/search?q=${encodeURIComponent(search.trim())}${storedToken ? `&token=${encodeURIComponent(storedToken)}` : ''}`)
            : Promise.resolve(null)
        ]);

        if (res && res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setRepos(list);
          cacheUsers(list.map(r => r.owner).filter(Boolean));
          if (category === "All" && !search.trim()) {
            setCachedData('explore_all_repos', list);
          }
        }

        if (usersRes && usersRes.ok) {
          const usersData = await usersRes.json();
          const uList = Array.isArray(usersData) ? usersData : [];
          setUsers(uList);
          cacheUsers(uList);
          const fMap = {};
          uList.forEach(u => {
            fMap[u.id] = Boolean(u.is_following);
          });
          setFollowingMap(prev => ({ ...prev, ...fMap }));
        } else if (!search.trim()) {
          setUsers([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 70);
    return () => clearTimeout(delayDebounceFn);
  }, [category, search, user?.id]);

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
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
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
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
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
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, is_following: data.following, followers_count: data.followers_count } : u));
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
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token') : null;
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

  const categories = ["All", "Coding", "Research", "Education", "Writing", "Productivity"];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#010409] text-[#c9d1d9] font-sans pb-28">
      {/* Sleek Centered Feed Stream Column */}
      <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-5">

        {/* Minimal Search & Filter Bar (Sticky Header) */}
        <div className="sticky top-14 sm:top-16 z-20 bg-[#010409]/95 backdrop-blur-md pb-3 pt-1 border-b border-[#21262d]">
          {/* Sleek Search Capsule */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b949e]" />
            <input 
              type="text" 
              placeholder="Search prompts, categories, or @creators..." 
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-full pl-10 pr-9 py-2 text-xs sm:text-sm text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] transition-colors placeholder:text-[#8b949e] shadow-sm"
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  if (val.trim()) {
                    url.searchParams.set("search", val);
                  } else {
                    url.searchParams.delete("search");
                  }
                  window.history.replaceState(null, "", url.toString());
                }
              }}
            />
            {search && (
              <button 
                onClick={() => {
                  setSearch("");
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("search");
                    window.history.replaceState(null, "", url.toString());
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#f0f6fc] p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Minimal Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  category === cat 
                    ? "bg-[#f0f6fc] text-[#0d1117] font-semibold shadow-sm" 
                    : "bg-[#161b22]/70 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] border border-[#30363d]/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Creators Matching Search (Only displayed when actively searching) */}
        {users.length > 0 && (
          <div className="py-4 border-b border-[#21262d]">
            <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#58a6ff]" />
              Creators Matching &quot;{search}&quot;
            </h3>
            <div className="space-y-2">
              {users.map(u => (
                <div 
                  key={u.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#161b22]/60 transition group"
                >
                  <Link 
                    href={`/u/${u.username}`}
                    onClick={() => cacheUser(u)}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <img 
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                      alt={u.username}
                      className="w-10 h-10 rounded-full border border-[#30363d] object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-[#f0f6fc] group-hover:text-[#58a6ff] truncate transition">
                        {u.name}
                      </div>
                      <div className="text-[11px] text-[#8b949e] truncate">
                        @{u.username} · {u.repos_count || 0} prompts
                      </div>
                    </div>
                  </Link>

                  {user?.id !== u.id && (
                    <button
                      onClick={(e) => handleToggleFollow(e, u.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                        followingMap[u.id]
                          ? "bg-[#21262d] hover:bg-red-950/40 hover:text-red-400 border border-[#363b42] text-[#c9d1d9]"
                          : "bg-[#238636] hover:bg-[#2ea043] text-white"
                      }`}
                    >
                      {followingMap[u.id] ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continuous Stream Feed */}
        <div>
          {loading ? (
            <div className="py-24 text-center text-[#8b949e] flex flex-col items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin mb-3 text-[#58a6ff]" />
              <span className="text-xs font-medium">Loading feed...</span>
            </div>
          ) : repos.length === 0 && users.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-3 text-[#8b949e]">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-[#f0f6fc] mb-1">
                {search.trim() ? `No prompts found for "${search}"` : "No prompts yet"}
              </p>
              <p className="text-xs text-[#8b949e] max-w-sm">
                Try searching for another keyword or change your category filter.
              </p>
            </div>
          ) : (
            <div>
              {repos.map((repo, idx) => {
                // In-feed "Suggested for You" after post index 2 (between post 3 & 4)
                const isSuggestedPosition = idx === 2;

                return (
                  <div key={repo.id}>
                    {/* The Seamless Post Item */}
                    <article className="py-5 sm:py-6 border-b border-[#21262d] transition-colors hover:bg-white/[0.015]">
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
                            className="w-10 h-10 rounded-full border border-[#30363d] object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs sm:text-sm text-[#f0f6fc] group-hover/author:text-[#58a6ff] transition truncate">
                                {repo.owner_name}
                              </span>
                              <span className="text-xs text-[#8b949e] truncate">
                                @{repo.owner_username}
                              </span>
                              <span className="text-[#484f58] text-xs">·</span>
                              <span className="text-xs text-[#8b949e]">
                                {formatPostDate(repo.created_at)}
                              </span>
                            </div>
                            {repo.category && (
                              <div className="mt-0.5">
                                <span className="text-[10px] text-[#8b949e] font-medium bg-[#161b22] px-2 py-0.5 rounded-full border border-[#30363d]/60">
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
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[#30363d] bg-[#161b22]/70 hover:bg-[#21262d] text-[#c9d1d9] hover:text-white transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <GitFork className="w-3.5 h-3.5 text-[#8b949e]" />
                          <span>Fork</span>
                        </button>
                      </div>

                      {/* Prompt Title & Description */}
                      <div 
                        onClick={() => router.push(`/repo/${repo.id}`)}
                        className="cursor-pointer mb-3"
                      >
                        <h2 className="text-sm sm:text-base font-semibold text-[#f0f6fc] hover:text-[#58a6ff] transition mb-1 leading-snug">
                          {repo.name}
                        </h2>
                        {repo.description && (
                          <p className="text-xs sm:text-[13px] text-[#8b949e] leading-relaxed">
                            {repo.description}
                          </p>
                        )}
                      </div>

                      {/* Prompt Content Preview */}
                      <div className="relative group/code rounded-xl border border-[#21262d] bg-[#0d1117] p-3.5 sm:p-4 mb-3 transition-colors">
                        <button
                          onClick={(e) => handleCopyPrompt(e, repo.latest_prompt, repo.id)}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-lg text-[#8b949e] hover:text-[#f0f6fc] opacity-0 group-hover/code:opacity-100 transition-opacity z-10 cursor-pointer"
                          title="Copy prompt"
                        >
                          {copiedId === repo.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <pre className="text-xs sm:text-[13px] font-mono text-[#c9d1d9] line-clamp-5 whitespace-pre-wrap leading-relaxed select-all">
                          {repo.latest_prompt}
                        </pre>
                      </div>

                      {/* Social Action Footer: Like (Heart), Copy, Optimize (Wand/Sparkles), View Versions */}
                      <div className="flex items-center justify-between text-xs text-[#8b949e] pt-1">
                        <div className="flex items-center gap-4 sm:gap-6">
                          {/* Like (Heart) - Instagram Style */}
                          <button
                            onClick={(e) => handleToggleStar(e, repo.id)}
                            title={repo.is_starred ? "Unlike" : "Like"}
                            className="flex items-center gap-1.5 transition group cursor-pointer"
                          >
                            <Heart 
                              className={`w-4 h-4 transition-all duration-200 ${
                                repo.is_starred 
                                  ? "fill-rose-500 text-rose-500 stroke-rose-500 scale-110" 
                                  : "text-[#8b949e] group-hover:text-rose-500 group-hover:scale-110 stroke-[1.8]"
                              }`} 
                            />
                            <span className={`font-semibold ${repo.is_starred ? "text-rose-500" : "text-[#8b949e] group-hover:text-[#f0f6fc]"}`}>
                              {repo.stars_count || 0}
                            </span>
                          </button>

                          {/* Quick Copy */}
                          <button
                            onClick={(e) => handleCopyPrompt(e, repo.latest_prompt, repo.id)}
                            title="Copy prompt"
                            className="flex items-center gap-1.5 hover:text-[#f0f6fc] transition cursor-pointer font-medium"
                          >
                            {copiedId === repo.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Optimize (AI Studio) */}
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                sessionStorage.setItem('optimize_prompt', repo.latest_prompt || '');
                                router.push('/dashboard');
                              }
                            }}
                            title="Optimize in Prysm AI Studio"
                            className="flex items-center gap-1.5 hover:text-cyan-400 transition cursor-pointer font-medium"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Optimize</span>
                          </button>
                        </div>

                        {/* View Versions Link */}
                        <Link
                          href={`/repo/${repo.id}`}
                          className="text-xs font-medium text-[#8b949e] hover:text-[#58a6ff] transition flex items-center gap-1"
                        >
                          <span>View versions</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </article>

                    {/* In-feed "Suggested for You" Section (Instagram Style) */}
                    {isSuggestedPosition && suggestedUsers.length > 0 && (
                      <section className="py-6 border-b border-[#21262d] my-1">
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-[#58a6ff]" />
                            <h3 className="text-xs font-bold text-[#f0f6fc] tracking-tight">Suggested for You</h3>
                          </div>
                          <span className="text-[11px] text-[#8b949e]">Top Creators</span>
                        </div>

                        {/* Horizontal Scrollable Creator Cards */}
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
                          {suggestedUsers.map(u => (
                            <div 
                              key={u.id}
                              className="min-w-[155px] max-w-[170px] p-3.5 rounded-2xl border border-[#30363d] bg-[#0d1117] flex flex-col items-center text-center shrink-0 hover:border-[#8b949e]/60 transition group"
                            >
                              <Link 
                                href={`/u/${u.username}`} 
                                onClick={() => cacheUser(u)}
                                className="flex flex-col items-center w-full"
                              >
                                <img 
                                  src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                                  alt={u.username}
                                  className="w-12 h-12 rounded-full border border-[#30363d] object-cover mb-2 shadow-sm"
                                />
                                <span className="font-semibold text-xs text-[#f0f6fc] group-hover:text-[#58a6ff] truncate w-full transition">
                                  {u.name}
                                </span>
                                <span className="text-[11px] text-[#8b949e] truncate w-full mb-1">
                                  @{u.username}
                                </span>
                                <span className="text-[10px] text-[#484f58] mb-3">
                                  {u.repos_count || 0} prompts
                                </span>
                              </Link>

                              {user?.id !== u.id && (
                                <button
                                  onClick={(e) => handleToggleFollow(e, u.id)}
                                  className={`w-full text-xs font-semibold py-1.5 px-2 rounded-lg transition shrink-0 cursor-pointer ${
                                    followingMap[u.id]
                                      ? "bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:bg-red-950/40 hover:text-red-400"
                                      : "bg-[#238636] hover:bg-[#2ea043] text-white"
                                  }`}
                                >
                                  {followingMap[u.id] ? "Following" : "Follow"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                );
              })}

              {/* In case there are fewer than 3 posts, still display Suggested for You at bottom */}
              {repos.length > 0 && repos.length < 3 && suggestedUsers.length > 0 && (
                <section className="py-6 border-b border-[#21262d] my-1">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#58a6ff]" />
                      <h3 className="text-xs font-bold text-[#f0f6fc] tracking-tight">Suggested for You</h3>
                    </div>
                    <span className="text-[11px] text-[#8b949e]">Top Creators</span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
                    {suggestedUsers.map(u => (
                      <div 
                        key={u.id}
                        className="min-w-[155px] max-w-[170px] p-3.5 rounded-2xl border border-[#30363d] bg-[#0d1117] flex flex-col items-center text-center shrink-0 hover:border-[#8b949e]/60 transition group"
                      >
                        <Link 
                          href={`/u/${u.username}`} 
                          onClick={() => cacheUser(u)}
                          className="flex flex-col items-center w-full"
                        >
                          <img 
                            src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                            alt={u.username}
                            className="w-12 h-12 rounded-full border border-[#30363d] object-cover mb-2 shadow-sm"
                          />
                          <span className="font-semibold text-xs text-[#f0f6fc] group-hover:text-[#58a6ff] truncate w-full transition">
                            {u.name}
                          </span>
                          <span className="text-[11px] text-[#8b949e] truncate w-full mb-1">
                            @{u.username}
                          </span>
                          <span className="text-[10px] text-[#484f58] mb-3">
                            {u.repos_count || 0} prompts
                          </span>
                        </Link>

                        {user?.id !== u.id && (
                          <button
                            onClick={(e) => handleToggleFollow(e, u.id)}
                            className={`w-full text-xs font-semibold py-1.5 px-2 rounded-lg transition shrink-0 cursor-pointer ${
                              followingMap[u.id]
                                ? "bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:bg-red-950/40 hover:text-red-400"
                                : "bg-[#238636] hover:bg-[#2ea043] text-white"
                            }`}
                          >
                            {followingMap[u.id] ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Fork Modal */}
      {forkModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010409]/80 backdrop-blur-sm p-4">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold text-[#f0f6fc] flex items-center gap-2 mb-2">
              <GitFork className="w-5 h-5 text-[#8b949e]" />
              Fork Repository
            </h2>
            <p className="text-xs text-[#8b949e] mb-5">
              Clone a copy of <span className="text-[#c9d1d9]">@{forkModalRepo.owner_username || forkModalRepo.owner_name}</span>&apos;s prompt into your workspace.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-1.5">Repository Name</label>
                <input
                  type="text"
                  value={forkRepoName}
                  onChange={(e) => setForkRepoName(e.target.value)}
                  className="w-full bg-[#010409] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-1.5">Visibility</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#8b949e] hover:text-[#c9d1d9]">
                    <input
                      type="radio"
                      name="fork_vis"
                      value="Private"
                      checked={forkVisibility === "Private"}
                      onChange={() => setForkVisibility("Private")}
                      className="accent-[#58a6ff]"
                    />
                    <Lock className="w-4 h-4" /> Private
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#8b949e] hover:text-[#c9d1d9]">
                    <input
                      type="radio"
                      name="fork_vis"
                      value="Public"
                      checked={forkVisibility === "Public"}
                      onChange={() => setForkVisibility("Public")}
                      className="accent-[#58a6ff]"
                    />
                    <Globe className="w-4 h-4" /> Public
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#30363d]">
              <button
                onClick={() => setForkModalRepo(null)}
                className="hover:bg-[#21262d] text-[#c9d1d9] text-xs font-semibold px-4 py-2 rounded-lg transition border border-transparent hover:border-[#30363d] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteFork}
                disabled={forkingId !== null}
                className="bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
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
      <div className="min-h-[calc(100vh-64px)] bg-[#010409] flex items-center justify-center text-[#8b949e]">
        <Loader2 className="w-8 h-8 animate-spin text-[#58a6ff]" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
