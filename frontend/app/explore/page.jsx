"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Compass, 
  Search, 
  GitFork, 
  Copy, 
  Check, 
  Book, 
  Globe, 
  Lock, 
  Sparkles,
  Loader2, 
  Share2, 
  Star,
  Users,
  UserPlus,
  UserCheck,
  Terminal,
  TrendingUp,
  MessageSquare
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { addCreatedRepoId, saveForkInfo } from "../../lib/repoStore";
import { API_URL } from "../../lib/api";

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams ? (searchParams.get("search") || "") : "";
  const { user } = useAuth();

  const [repos, setRepos] = useState([]);
  const [users, setUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
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

  // Fetch suggested creators for the sidebar
  useEffect(() => {
    async function fetchSuggested() {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
        const res = await fetch(`${API_URL}/api/auth/users/suggested${storedToken ? `?token=${encodeURIComponent(storedToken)}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestedUsers(Array.isArray(data) ? data : []);
          const fMap = {};
          data.forEach(u => {
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

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
        const queryParams = new URLSearchParams();
        if (category !== "All") queryParams.append("category", category);
        if (search) queryParams.append("search", search);
        if (user?.id) queryParams.append("user_id", user.id);
        if (storedToken) queryParams.append("token", storedToken);
        
        const res = await fetch(`${API_URL}/api/repositories/explore?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRepos(Array.isArray(data) ? data : []);
        }

        if (search.trim()) {
          const usersRes = await fetch(`${API_URL}/api/auth/users/search?q=${encodeURIComponent(search.trim())}${storedToken ? `&token=${encodeURIComponent(storedToken)}` : ''}`);
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(Array.isArray(usersData) ? usersData : []);
            const fMap = {};
            usersData.forEach(u => {
              fMap[u.id] = Boolean(u.is_following);
            });
            setFollowingMap(prev => ({ ...prev, ...fMap }));
          }
        } else {
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
    }, 300);
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
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
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
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const res = await fetch(`${API_URL}/api/auth/users/${targetUserId}/follow${storedToken ? `?token=${encodeURIComponent(storedToken)}` : ''}`, {
        method: 'POST',
        headers: storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setFollowingMap(prev => ({ ...prev, [targetUserId]: data.following }));
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
    setForkVisibility("Private"); // Default private
  };

  const handleExecuteFork = async () => {
    if (!forkModalRepo) return;
    setForkingId(forkModalRepo.id);
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);
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
    <div className="min-h-[calc(100vh-56px)] bg-[#010409] text-[#c9d1d9] font-sans pb-24">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 p-4 sm:p-6 lg:p-8 w-full">
        
        {/* Left Sidebar - Navigation & Categories */}
        <aside className="w-full lg:w-60 shrink-0 space-y-6">
          {/* Search bar */}
          <div>
            <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-3">
              Search
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8b949e]" />
              <input 
                type="text" 
                placeholder="Find prompts or @users..." 
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-sm text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] transition-colors placeholder:text-[#8b949e]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-3 flex items-center justify-between">
              Categories
              <Sparkles className="w-3.5 h-3.5 text-[#58a6ff]" />
            </h2>
            <div className="flex flex-col gap-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    category === cat 
                      ? "bg-[#161b22] text-[#f0f6fc] font-semibold border border-[#30363d]" 
                      : "text-[#8b949e] hover:bg-[#161b22]/50 hover:text-[#c9d1d9]"
                  }`}
                >
                  <span className={`${category === cat ? "text-[#58a6ff]" : "text-[#484f58]"}`}>#</span>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Top Creators Sidebar Section */}
          {suggestedUsers.length > 0 && (
            <div className="pt-4 border-t border-[#30363d]">
              <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>Top Creators</span>
                <Users className="w-3.5 h-3.5 text-[#58a6ff]" />
              </h2>
              <div className="space-y-2.5">
                {suggestedUsers.slice(0, 6).map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[#161b22] transition group">
                    <Link href={`/u/${u.username}`} className="flex items-center gap-2 min-w-0 flex-1">
                      <img 
                        src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                        alt={u.username}
                        className="w-7 h-7 rounded-full border border-[#30363d] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#f0f6fc] group-hover:text-[#58a6ff] truncate transition">
                          {u.name}
                        </div>
                        <div className="text-[10px] text-[#8b949e] truncate">
                          @{u.username} · {u.repos_count || 0} prompts
                        </div>
                      </div>
                    </Link>
                    {user?.id !== u.id && (
                      <button
                        onClick={(e) => handleToggleFollow(e, u.id)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded transition shrink-0 ${
                          followingMap[u.id]
                            ? "bg-[#21262d] text-[#8b949e] border border-[#30363d]"
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
        </aside>

        {/* Main Feed Area */}
        <main className="flex-1 min-w-0">
          
          {/* Header Banner */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden flex flex-col justify-end min-h-[160px]">
             <div className="absolute right-6 top-6 opacity-10">
                <Globe className="w-32 h-32" />
             </div>
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                   <Compass className="w-4 h-4 text-[#58a6ff]" />
                   <span className="text-xs font-bold text-[#58a6ff] tracking-widest uppercase">Explore Feed</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#f0f6fc] mb-2">Community Prompts</h1>
                <p className="text-[#8b949e] max-w-xl text-xs sm:text-sm leading-relaxed">
                  Discover, fork, star, and test AI prompts crafted by top creators.
                </p>
             </div>
          </div>

          {/* Creators Section (When search is active or matched) */}
          {users.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#58a6ff]" />
                Creators matching &quot;{search}&quot;
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {users.map(u => (
                  <div 
                    key={u.id}
                    className="bg-[#0d1117] border border-[#30363d] hover:border-[#8b949e]/60 rounded-xl p-4 flex items-center justify-between gap-4 transition group"
                  >
                    <Link 
                      href={`/u/${u.username}`}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <img 
                        src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                        alt={u.username}
                        className="w-11 h-11 rounded-full border border-[#30363d] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#f0f6fc] group-hover:text-[#58a6ff] truncate transition">
                          {u.name}
                        </div>
                        <div className="text-xs text-[#8b949e] truncate">
                          @{u.username}
                        </div>
                        <div className="text-[10px] text-[#484f58] mt-0.5">
                          {u.repos_count || 0} prompts · {u.followers_count || 0} followers
                        </div>
                      </div>
                    </Link>

                    {user?.id !== u.id && (
                      <button
                        onClick={(e) => handleToggleFollow(e, u.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition ${
                          followingMap[u.id]
                            ? "bg-[#21262d] hover:bg-red-950/40 hover:text-red-400 border border-[#363b42] text-[#c9d1d9]"
                            : "bg-[#238636] hover:bg-[#2ea043] text-white"
                        }`}
                      >
                        {followingMap[u.id] ? (
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
                ))}
              </div>
            </div>
          )}

          {/* Feed List */}
          <div className="space-y-6">
            {loading ? (
              <div className="py-20 text-center text-[#8b949e] flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <span className="text-sm font-medium">Loading prompts...</span>
              </div>
            ) : repos.length === 0 && users.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center bg-[#0d1117] border border-[#30363d] rounded-2xl">
                <Compass className="w-8 h-8 text-[#8b949e] mb-3" />
                <p className="text-base font-semibold text-[#f0f6fc] mb-1">No prompts found</p>
                <p className="text-xs text-[#8b949e] max-w-sm">
                  Try another keyword or category filter.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#58a6ff]" />
                    Featured Prompts ({repos.length})
                  </h3>
                </div>

                <div className="space-y-5">
                  {repos.map(repo => (
                    <div 
                      key={repo.id} 
                      className="bg-[#0d1117] border border-[#30363d] hover:border-[#8b949e]/60 rounded-2xl p-6 transition group"
                    >
                      {/* Post Header: Creator & Time */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                        <Link 
                          href={`/u/${repo.owner_username}`}
                          className="flex items-center gap-3 group/author"
                        >
                          <img 
                            src={repo.owner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner_name}`} 
                            alt={repo.owner_name} 
                            className="w-10 h-10 rounded-full border border-[#30363d] object-cover shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[#f0f6fc] group-hover/author:text-[#58a6ff] transition">
                                {repo.owner_name}
                              </span>
                              <span className="text-xs text-[#8b949e]">
                                @{repo.owner_username}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#484f58] flex items-center gap-1.5 mt-0.5">
                              <span>{new Date(repo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span>·</span>
                              <span className="bg-[#161b22] px-1.5 py-0.5 rounded text-[10px] border border-[#30363d] text-[#8b949e]">
                                {repo.category}
                              </span>
                            </div>
                          </div>
                        </Link>

                        {/* Top-Right Fork Button */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={(e) => openForkModal(e, repo)}
                            className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                          >
                            <GitFork className="w-3.5 h-3.5 text-[#8b949e]" />
                            Fork
                          </button>
                        </div>
                      </div>

                      {/* Prompt Title & Description */}
                      <div 
                        onClick={() => router.push(`/repo/${repo.id}`)}
                        className="cursor-pointer mb-3"
                      >
                        <h2 className="text-base font-bold text-[#f0f6fc] group-hover:text-[#58a6ff] transition mb-1">
                          {repo.name}
                        </h2>
                        <p className="text-xs text-[#8b949e] leading-relaxed">
                          {repo.description || "Prompt repository"}
                        </p>
                      </div>

                      {/* Prompt Preview Snippet */}
                      <div className="bg-[#010409] border border-[#21262d] rounded-xl p-4 relative group/code overflow-hidden mb-4">
                        <button
                          onClick={(e) => handleCopyPrompt(e, repo.latest_prompt, repo.id)}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-lg text-[#8b949e] hover:text-[#f0f6fc] opacity-0 group-hover/code:opacity-100 transition-opacity z-10"
                          title="Copy prompt"
                        >
                          {copiedId === repo.id ? (
                            <Check className="w-4 h-4 text-[#3fb950]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <pre className="text-xs font-mono text-[#8b949e] line-clamp-4 whitespace-pre-wrap leading-relaxed select-all">
                          {repo.latest_prompt}
                        </pre>
                      </div>

                      {/* Social Action Footer: Like/Star, Copy, Chat, Share */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#21262d] text-xs text-[#8b949e]">
                        <div className="flex items-center gap-4">
                          {/* Star / Like */}
                          <button
                            onClick={(e) => handleToggleStar(e, repo.id)}
                            className={`flex items-center gap-1.5 transition hover:text-[#e3b341] ${
                              repo.is_starred ? "text-[#e3b341]" : "text-[#8b949e]"
                            }`}
                          >
                            <Star className={`w-4 h-4 ${repo.is_starred ? "fill-[#e3b341]" : ""}`} />
                            <span className="font-semibold">{repo.stars_count || 0}</span>
                          </button>

                          {/* Quick Copy */}
                          <button
                            onClick={(e) => handleCopyPrompt(e, repo.latest_prompt, repo.id)}
                            className="flex items-center gap-1.5 hover:text-[#f0f6fc] transition"
                          >
                            {copiedId === repo.id ? (
                              <>
                                <Check className="w-4 h-4 text-[#3fb950]" />
                                <span className="text-[#3fb950]">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Try in Playground */}
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                sessionStorage.setItem('optimize_prompt', repo.latest_prompt || '');
                                router.push('/dashboard');
                              }
                            }}
                            className="flex items-center gap-1.5 hover:text-[#58a6ff] transition"
                          >
                            <Terminal className="w-4 h-4" />
                            <span>Playground</span>
                          </button>
                        </div>

                        <Link
                          href={`/repo/${repo.id}`}
                          className="text-xs font-medium text-[#58a6ff] hover:underline"
                        >
                          View versions →
                        </Link>
                      </div>

                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>

        {/* Right Sidebar - Suggested Creators / Who to Follow */}
        <aside className="w-full lg:w-72 shrink-0 space-y-6">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#58a6ff]" />
              Creators to follow
            </h3>

            {suggestedUsers.length > 0 ? (
              <div className="space-y-4">
                {suggestedUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-3">
                    <Link href={`/u/${u.username}`} className="flex items-center gap-2.5 min-w-0 group">
                      <img 
                        src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                        alt={u.username}
                        className="w-9 h-9 rounded-full border border-[#30363d] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#f0f6fc] group-hover:text-[#58a6ff] truncate transition">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-[#8b949e] truncate">
                          @{u.username}
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={(e) => handleToggleFollow(e, u.id)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 transition ${
                        followingMap[u.id]
                          ? "bg-[#21262d] text-[#c9d1d9] border border-[#363b42] hover:bg-red-950/40 hover:text-red-400"
                          : "bg-[#238636] hover:bg-[#2ea043] text-white"
                      }`}
                    >
                      {followingMap[u.id] ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8b949e]">No new suggestions right now.</p>
            )}
          </div>

          {/* Social Stats Info Card */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 text-xs text-[#8b949e] space-y-3">
            <div className="font-semibold text-[#f0f6fc] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#e3b341]" />
              PromptHub Network
            </div>
            <p className="leading-relaxed">
              Star your favorite prompts, follow prompt engineers, and fork prompts to build your personal library.
            </p>
          </div>
        </aside>

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
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-1.5">Repository name</label>
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
                className="hover:bg-[#21262d] text-[#c9d1d9] text-xs font-semibold px-4 py-2 rounded-lg transition border border-transparent hover:border-[#30363d]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteFork}
                disabled={forkingId !== null}
                className="bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
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
      <div className="min-h-[calc(100vh-56px)] bg-[#010409] flex items-center justify-center text-[#8b949e]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
