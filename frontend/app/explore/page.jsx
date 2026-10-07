"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Compass, 
  Clock, 
  Search, 
  GitFork, 
  Copy, 
  Check, 
  Book, 
  Globe, 
  Lock, 
  Sparkles,
  ArrowRight,
  Loader2,
  MessageSquare,
  Share,
  MoreHorizontal
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { addCreatedRepoId, saveForkInfo } from "../../lib/repoStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [repos, setRepos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [forkingId, setForkingId] = useState(null);
  const [forkModalRepo, setForkModalRepo] = useState(null);
  const [forkVisibility, setForkVisibility] = useState("Private");
  const [forkRepoName, setForkRepoName] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (category !== "All") queryParams.append("category", category);
        if (search) queryParams.append("search", search);
        if (user?.id) queryParams.append("user_id", user.id);
        
        const res = await fetch(`${API_URL}/api/repositories/explore?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRepos(data);
        }

        if (search) {
          const usersRes = await fetch(`${API_URL}/api/auth/users/search?q=${encodeURIComponent(search)}`);
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(usersData);
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
  }, [category, search]);

  const handleCopyPrompt = (e, promptText, id) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(promptText || "");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      const userQuery = user?.id ? `?user_id=${user.id}` : "";
      const res = await fetch(`${API_URL}/api/repositories${userQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="min-h-[calc(100vh-56px)] bg-[#010409] text-[#c9d1d9] font-sans pb-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 p-4 sm:p-6 lg:p-8 w-full">
        
        {/* Left Sidebar - Navigation & Filters */}
        <aside className="w-full md:w-64 shrink-0 space-y-8">
          {/* Search */}
          <div>
            <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-4">Search</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8b949e]" />
              <input 
                type="text" 
                placeholder="Find prompts..." 
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-sm text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] transition-colors placeholder:text-[#8b949e]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center justify-between">
              Categories
              <Sparkles className="w-3.5 h-3.5 text-[#58a6ff]" />
            </h2>
            <div className="flex flex-col gap-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    category === cat 
                      ? "bg-[#161b22] text-[#f0f6fc] font-medium" 
                      : "text-[#8b949e] hover:bg-[#161b22]/50 hover:text-[#c9d1d9]"
                  }`}
                >
                  <span className={`${category === cat ? "text-[#58a6ff]" : "text-[#484f58]"}`}>#</span>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Feed Area */}
        <main className="flex-1 min-w-0">
          
          {/* Large Header Banner */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-8 mb-8 relative overflow-hidden flex flex-col justify-end min-h-[200px]">
             {/* Decorative faint icon instead of gradient */}
             <div className="absolute right-8 top-8 opacity-10">
                <Globe className="w-32 h-32" />
             </div>
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                   <Compass className="w-5 h-5 text-[#58a6ff]" />
                   <span className="text-xs font-bold text-[#58a6ff] tracking-widest uppercase">Explore</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#f0f6fc] mb-3">Community Prompts</h1>
                <p className="text-[#8b949e] max-w-xl text-sm leading-relaxed">
                  Discover, fork, and enhance public prompts created by the community. 
                  Minimalist and strictly dark theme for maximum focus.
                </p>
             </div>
          </div>

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
                <p className="text-base font-semibold text-[#f0f6fc] mb-1">Nothing found</p>
                <p className="text-sm text-[#8b949e] max-w-sm">No users or public prompts match your criteria.</p>
              </div>
            ) : (
              <>
                {users.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-widest mb-4">Users</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {users.map(u => (
                        <Link 
                          key={u.id}
                          href={`/u/${u.username}`}
                          className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex items-center gap-4 hover:border-[#8b949e] transition group"
                        >
                          <img 
                            src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                            alt={u.username}
                            className="w-12 h-12 rounded-full border border-[#30363d] object-cover"
                          />
                          <div>
                            <div className="font-semibold text-[#f0f6fc] group-hover:text-[#58a6ff] transition">{u.name}</div>
                            <div className="text-xs text-[#8b949e]">@{u.username}</div>
                            <div className="text-[10px] text-[#484f58] mt-0.5">ID: {u.id}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {repos.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-widest mb-4">Repositories</h3>
                    <div className="space-y-6">
                      {repos.map(repo => (
                <div 
                  key={repo.id} 
                  className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 transition-colors hover:border-[#8b949e] cursor-pointer group"
                  onClick={() => router.push(`/repo/${repo.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    
                    {/* Header Left: Avatar & Info */}
                    <div className="flex items-center gap-3">
                      <img 
                        src={repo.owner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner_name}`} 
                        alt={repo.owner_name} 
                        className="w-10 h-10 rounded-full border border-[#30363d] object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-[#f0f6fc] text-base leading-tight hover:underline flex items-center gap-2">
                          {repo.name}
                        </h3>
                        <div className="text-xs text-[#8b949e] mt-1 flex items-center gap-1.5">
                          <span className="font-medium text-[#c9d1d9]">@{repo.owner_username || repo.owner_name?.toLowerCase().replace(/\s+/g, '') || "user"}</span>
                          <span>·</span>
                          <span>{new Date(repo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span>·</span>
                          <span className="bg-[#161b22] px-1.5 py-0.5 rounded text-[10px] border border-[#30363d]">{repo.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Header Right: Actions (Fork) */}
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={(e) => openForkModal(e, repo)}
                        className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
                      >
                        <GitFork className="w-3.5 h-3.5 text-[#8b949e]" />
                        Fork
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[#c9d1d9] text-sm mb-5 leading-relaxed">
                    {repo.description}
                  </p>

                  {/* Code Snippet Box */}
                  <div className="bg-[#010409] border border-[#21262d] rounded-xl p-4 relative group/code overflow-hidden">
                    <button
                      onClick={(e) => handleCopyPrompt(e, repo.latest_prompt, repo.id)}
                      className="absolute top-2 right-2 p-1.5 bg-[#161b22] border border-[#30363d] rounded-md text-[#8b949e] hover:text-[#f0f6fc] opacity-0 group-hover/code:opacity-100 transition-opacity z-10"
                      title="Copy Prompt"
                    >
                      {copiedId === repo.id ? (
                        <Check className="w-4 h-4 text-[#3fb950]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <pre className="text-[13px] font-mono text-[#8b949e] line-clamp-4 whitespace-pre-wrap leading-relaxed">
                      {repo.latest_prompt}
                    </pre>
                  </div>
                </div>
              ))}
              </div>
            </>
            )}
          </>
          )}
          </div>
        </main>
      </div>

      {/* Fork Modal */}
      {forkModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010409]/80 backdrop-blur-sm p-4">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold text-[#f0f6fc] flex items-center gap-2 mb-2">
              <GitFork className="w-5 h-5 text-[#8b949e]" />
              Fork Repository
            </h2>
            <p className="text-sm text-[#8b949e] mb-6">
              Create a copy of <span className="text-[#c9d1d9]">@{forkModalRepo.owner_name?.toLowerCase().replace(/\s+/g, '')}</span>'s prompt into your workspace.
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
                className="bg-transparent hover:bg-[#21262d] text-[#c9d1d9] text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-[#30363d]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteFork}
                disabled={forkingId !== null}
                className="bg-[#238636] hover:bg-[#2ea043] text-white font-medium text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
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

