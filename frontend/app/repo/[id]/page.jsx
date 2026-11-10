"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Book, 
  Copy, 
  Edit, 
  History, 
  FileText, 
  Check, 
  Star, 
  GitFork, 
  Eye, 
  GitBranch, 
  GitCompare, 
  ChevronDown, 
  Sparkles, 
  ArrowLeft, 
  Lock, 
  Globe, 
  Settings, 
  AlertTriangle, 
  Code as CodeIcon, 
  ExternalLink, 
  CheckCircle,
  Clock,
  FileCode,
  Download,
  Terminal,
  User as UserIcon,
  UserCheck,
  UserPlus,
  Loader2
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { 
  isUserRepo, 
  addCreatedRepoId, 
  saveForkInfo, 
  getForkInfo, 
  isRepoStarred, 
  getStarredRepoIds,
  toggleStarRepo,
  removeCreatedRepoId
} from "../../../lib/repoStore";

import { API_URL } from "../../../lib/api";
import { getCachedData, setCachedData, cacheUser } from "../../../lib/cache";

// Helper to format relative time (e.g. "2 hours ago", "just now")
function formatRelativeTime(dateString) {
  if (!dateString) return "recently";
  // Append Z to enforce UTC parsing since FastAPI returns naive UTC datetimes
  const parseStr = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  const date = new Date(parseStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Generate short commit SHA from version ID or string
function generateShortSha(id, versionStr) {
  if (!id) return "7f3a9e1";
  let hash = 0;
  const str = id + (versionStr || "");
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(7, "0").slice(0, 7);
}

export default function RepositoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  // Repository state - clean instant SSR & cache baseline
  const [repo, setRepo] = useState(() => {
    if (typeof window !== 'undefined' && id) {
      try {
        const direct = getCachedData(`repo_detail_${id}`, null);
        if (direct) return direct;
        const exploreList = getCachedData('explore_all_repos', []);
        if (Array.isArray(exploreList)) {
          const found = exploreList.find(r => r.id === id);
          if (found) return found;
        }
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined' && id) {
      try {
        const direct = getCachedData(`repo_detail_${id}`, null);
        if (direct) return false;
        const exploreList = getCachedData('explore_all_repos', []);
        if (Array.isArray(exploreList) && exploreList.some(r => r.id === id)) return false;
      } catch {}
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState("Code"); // Code, Commits, Compare, Settings
  const [viewMode, setViewMode] = useState("raw"); // raw, preview

  const [currentPrompt, setCurrentPrompt] = useState(() => {
    if (typeof window !== 'undefined' && id) {
      try {
        const direct = getCachedData(`repo_detail_${id}`, null);
        if (direct) return direct.latest_prompt || direct.versions?.[0]?.content || "";
        const exploreList = getCachedData('explore_all_repos', []);
        if (Array.isArray(exploreList)) {
          const found = exploreList.find(r => r.id === id);
          if (found) return found.latest_prompt || "";
        }
      } catch {}
    }
    return "";
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [commitTitle, setCommitTitle] = useState("");
  const [commitDesc, setCommitDesc] = useState("");
  const [versionBump, setVersionBump] = useState("patch");
  const [activeVersion, setActiveVersion] = useState(() => {
    if (typeof window !== 'undefined' && id) {
      try {
        const direct = getCachedData(`repo_detail_${id}`, null);
        if (direct && direct.versions?.length > 0) return direct.versions[0];
      } catch {}
    }
    return null;
  });
  const [copied, setCopied] = useState(false);
  const [copiedSha, setCopiedSha] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [isAuthorFollowing, setIsAuthorFollowing] = useState(false);
  const [isAuthorFollowLoading, setIsAuthorFollowLoading] = useState(false);

  // Fork state
  const [forkModalOpen, setForkModalOpen] = useState(false);
  const [forkRepoName, setForkRepoName] = useState("");
  const [forkVisibility, setForkVisibility] = useState("Private");
  const [forking, setForking] = useState(false);
  const [forkInfo, setForkInfo] = useState(null);

  // Clone dropdown
  const [isCodeDropdownOpen, setIsCodeDropdownOpen] = useState(false);

  // Visibility toggle modal in Settings / Header
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  // Delete repository modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Compare Tab state
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareResult, setCompareResult] = useState(null);

  const fetchRepo = useCallback(async () => {
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

      const res = await fetch(`${API_URL}/api/repositories/${id}?${queryParams.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRepo(data);
        setCachedData(`repo_detail_${id}`, data);
        setLoading(false);
        if (data.owner) {
          cacheUser(data.owner);
        } else if (data.owner_username) {
          cacheUser({
            id: data.owner_id,
            username: data.owner_username,
            name: data.owner_name,
            avatar: data.owner_avatar
          });
        }
        setIsStarred(Boolean(data.is_starred));
        setStarCount(data.stars_count || 0);

        // Keep local store in sync if starred
        if (data.is_starred) {
          const currentStarred = getStarredRepoIds();
          if (!currentStarred.includes(data.id)) {
            toggleStarRepo(data.id);
          }
        }

        if (data.versions && data.versions.length > 0) {
          setActiveVersion(data.versions[0]);
          setCurrentPrompt(data.versions[0].content);
        }
      }
    } catch (e) {
      console.error("fetchRepo error:", e);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (id) {
      const cached = getCachedData(`repo_detail_${id}`, null);
      if (cached) {
        setRepo(cached);
        setLoading(false);
        if (cached.versions && cached.versions.length > 0) {
          setActiveVersion(cached.versions[0]);
          setCurrentPrompt(cached.versions[0].content || "");
        }
        setIsStarred(Boolean(cached.is_starred));
        setStarCount(cached.stars_count || 0);
      }
    }
    fetchRepo();
  }, [id, fetchRepo]);

  useEffect(() => {
    if (repo?.id) {
      // Prioritize backend state, fallback to local store if not set
      if (repo.is_starred !== undefined) {
        setIsStarred(Boolean(repo.is_starred));
      } else {
        setIsStarred(isRepoStarred(repo.id));
      }
      setForkInfo(getForkInfo(repo.id));
    }
  }, [repo?.id, repo?.is_starred]);

  // Check if current user is following the repository author
  useEffect(() => {
    async function checkAuthorFollow() {
      if (!repo?.owner_username || !user?.id || user.id === repo.owner_id) return;
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
        const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(repo.owner_username)}${storedToken ? `?token=${encodeURIComponent(storedToken)}` : ''}`);
        if (res.ok) {
          const uData = await res.json();
          setIsAuthorFollowing(Boolean(uData.is_following));
        }
      } catch (e) {
        console.error("Check author follow error:", e);
      }
    }
    checkAuthorFollow();
  }, [repo?.owner_username, repo?.owner_id, user?.id]);

  const handleToggleAuthorFollow = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!repo?.owner_id || isAuthorFollowLoading) return;
    setIsAuthorFollowLoading(true);
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (effectiveUserId) queryParams.set('user_id', effectiveUserId);
      const headers = {
        ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
        ...(effectiveUserId ? { 'X-User-Id': effectiveUserId } : {})
      };
      const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(repo.owner_id)}/follow?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setIsAuthorFollowing(data.following);
      }
    } catch (e) {
      console.error("Author follow toggle error:", e);
    } finally {
      setIsAuthorFollowLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySha = (sha, key) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(key);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  const handleToggleStar = async () => {
    if (!repo) return;
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
    const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);

    if (!user && !effectiveUserId && !storedToken) {
      router.push('/login');
      return;
    }

    // Optimistic UI update
    const nextStarred = !isStarred;
    setIsStarred(nextStarred);
    setStarCount(prev => nextStarred ? prev + 1 : Math.max(0, prev - 1));
    toggleStarRepo(repo.id);

    try {
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (effectiveUserId) queryParams.set('user_id', effectiveUserId);

      const headers = {
        ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
        ...(effectiveUserId ? { 'X-User-Id': effectiveUserId } : {})
      };

      const res = await fetch(`${API_URL}/api/repositories/${repo.id}/star?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setIsStarred(Boolean(data.starred));
        setStarCount(data.stars_count);
      } else {
        // Revert on API failure
        setIsStarred(!nextStarred);
        setStarCount(prev => !nextStarred ? prev + 1 : Math.max(0, prev - 1));
        toggleStarRepo(repo.id);
      }
    } catch (e) {
      console.error("Star toggle error:", e);
      // Revert on network failure
      setIsStarred(!nextStarred);
      setStarCount(prev => !nextStarred ? prev + 1 : Math.max(0, prev - 1));
      toggleStarRepo(repo.id);
    }
  };

  const startEditing = () => {
    setEditContent(currentPrompt);
    setCommitTitle(`Update system_prompt.md (${activeVersion?.version || 'v1.0'})`);
    setCommitDesc("");
    setVersionBump("patch");
    setIsEditing(true);
  };

  const savePrompt = async () => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/repositories/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent,
          change_description: commitTitle.trim() || `Updated prompt (${versionBump})`,
          version_bump: versionBump
        })
      });
      if (res.ok) {
        setIsEditing(false);
        setAiResult(null);
        await fetchRepo();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const optimizePrompt = async () => {
    setOptimizing(true);
    try {
      const res = await fetch(`${API_URL}/api/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
        setEditContent(data.improved_prompt);
        setCommitTitle("AI Optimization: " + (data.changes ? data.changes.join(", ") : "Refined prompt structure"));
        setIsEditing(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOptimizing(false);
    }
  };

  const optimizeInChatbot = () => {
    sessionStorage.setItem('optimize_prompt', currentPrompt);
    router.push('/dashboard');
  };

  // Toggle repository visibility: Public <-> Private
  const handleToggleVisibility = async () => {
    if (!repo) return;
    const newVisibility = repo.visibility === "Public" ? "Private" : "Public";
    setIsUpdatingVisibility(true);
    try {
      const res = await fetch(`${API_URL}/api/repositories/${repo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility })
      });
      if (res.ok) {
        const updated = await res.json();
        setRepo(prev => ({ ...prev, visibility: updated.visibility }));
        setVisibilityModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to update visibility");
      }
    } catch (e) {
      console.error("Visibility toggle failed:", e);
      alert("Failed to update repository visibility");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  // Delete repository
  const handleDeleteRepository = async () => {
    if (!repo) return;
    setIsDeleting(true);
    try {
      const userQuery = user?.id ? `?user_id=${user.id}` : "";
      const res = await fetch(`${API_URL}/api/repositories/${repo.id}${userQuery}`, {
        method: "DELETE"
      });
      if (res.ok) {
        removeCreatedRepoId(repo.id);
        router.push("/profile");
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to delete repository");
      }
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete repository");
    } finally {
      setIsDeleting(false);
    }
  };

  // Fork repository
  const handleExecuteFork = async () => {
    if (!repo) return;
    setForking(true);
    try {
      const userQuery = user?.id ? `?user_id=${user.id}` : "";
      const forkName = forkRepoName.trim() || repo.name;
      const res = await fetch(`${API_URL}/api/repositories${userQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: forkName,
          description: `Forked from ${repo.owner_username || 'community'}/${repo.name}. ${repo.description || ''}`,
          category: repo.category || "Other",
          visibility: forkVisibility, // Default Private
          initial_prompt: currentPrompt || repo.latest_prompt || "Forked prompt instructions."
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to fork repository");
      }

      const newRepo = await res.json();
      addCreatedRepoId(newRepo.id);
      saveForkInfo(newRepo.id, repo);
      setForkModalOpen(false);
      router.push(`/repo/${newRepo.id}`);
    } catch (e) {
      console.error("Fork error:", e);
      alert(e.message || "Failed to fork repository.");
    } finally {
      setForking(false);
    }
  };

  // Clone prompt to user repositories with 1 click
  const handleCloneToMyRepos = async () => {
    if (!repo) return;
    setIsCodeDropdownOpen(false);
    try {
      const userQuery = user?.id ? `?user_id=${user.id}` : "";
      const cloneName = `${repo.name}-clone`;
      const res = await fetch(`${API_URL}/api/repositories${userQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cloneName,
          description: `Cloned from ${repo.owner_username || 'community'}/${repo.name}.`,
          category: repo.category || "Other",
          visibility: "Private", // Private by default
          initial_prompt: currentPrompt || repo.latest_prompt || "Cloned prompt instructions."
        })
      });

      if (res.ok) {
        const clonedRepo = await res.json();
        addCreatedRepoId(clonedRepo.id);
        saveForkInfo(clonedRepo.id, repo);
        router.push(`/repo/${clonedRepo.id}`);
      }
    } catch (e) {
      console.error("Clone error:", e);
    }
  };

  const handleCompare = async () => {
    if (!compareA || !compareB) return;
    try {
      const res = await fetch(`${API_URL}/api/repositories/${id}/versions/compare?v_a=${compareA}&v_b=${compareB}`);
      if (res.ok) {
        const data = await res.json();
        setCompareResult(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Group commits by date for authentic GitHub commit history UI
  const commitsByDate = useMemo(() => {
    if (!repo?.versions) return {};
    const groups = {};
    repo.versions.forEach(ver => {
      const parseStr = ver.created_at.endsWith('Z') ? ver.created_at : `${ver.created_at}Z`;
      const dateKey = new Date(parseStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(ver);
    });
    return groups;
  }, [repo?.versions]);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-24 text-center text-[#8b949e]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#58a6ff] mb-4"></div>
        <p className="text-sm font-medium">Loading repository...</p>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-24 text-center">
        <h2 className="text-xl font-semibold text-[#f0f6fc] mb-2">Prompt Repository not found</h2>
        <p className="text-sm text-[#8b949e] mb-6">The requested repository could not be found or has been moved.</p>
        <Link href="/dashboard" className="bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold px-4 py-2 rounded-md transition">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const promptLines = currentPrompt ? currentPrompt.split("\n") : [];
  const latestVersion = repo.versions?.[0] || activeVersion;
  const isOwner = isUserRepo(repo.id);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#010409] text-[#c9d1d9] pb-16">
      
      {/* ========================================================
          TOP REPOSITORY HEADER (Exact GitHub Header)
         ======================================================== */}
      <div className="bg-[#0d1117] border-b border-[#21262d] pt-5 pb-0 px-4 sm:px-8">
        <div className="max-w-[1280px] mx-auto">
          
          {/* Breadcrumb row & GitHub Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
            
            {/* Repo Owner / Name / Visibility Badge */}
            <div>
              <div className="flex items-center gap-2 flex-wrap text-lg">
                <Book className="w-5 h-5 text-[#8b949e]" />
                <Link 
                  href={`/u/${repo.owner_username || 'user'}`}
                  className="inline-flex items-center gap-2 text-[#58a6ff] font-normal hover:underline cursor-pointer group"
                >
                  <img 
                    src={repo.owner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner_username || repo.owner_name || 'author'}`}
                    alt={repo.owner_name || repo.owner_username || 'Author'}
                    className="w-5 h-5 rounded-full border border-[#30363d] group-hover:border-[#58a6ff] object-cover shrink-0 transition"
                  />
                  <span>{repo.owner_username || 'user'}</span>
                </Link>
                <span className="text-[#8b949e]">/</span>
                <span className="font-bold text-[#58a6ff]">
                  {repo.name}
                </span>

                {/* Visibility Badge (Public / Private) */}
                <button
                  onClick={() => setVisibilityModalOpen(true)}
                  title={isOwner ? "Click to change visibility" : `Visibility: ${repo.visibility || 'Public'}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium border border-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] hover:border-[#8b949e] px-2 py-0.5 rounded-full ml-1 transition"
                >
                  {repo.visibility === "Private" ? (
                    <>
                      <Lock className="w-3 h-3 text-[#e3b341]" />
                      <span>Private</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3 h-3 text-[#3fb950]" />
                      <span>Public</span>
                    </>
                  )}
                  {isOwner && <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
                </button>
              </div>

              {/* Forked From Subtitle (if forked) */}
              {forkInfo && (
                <div className="text-xs text-[#8b949e] mt-1 flex items-center gap-1">
                  <span>forked from</span>
                  <Link href={`/u/${forkInfo.owner_username || 'user'}`} className="text-[#58a6ff] hover:underline font-mono">
                    {forkInfo.owner_username || forkInfo.owner_name}
                  </Link>
                  <span className="text-[#8b949e]">/</span>
                  <Link href={`/repo/${forkInfo.id}`} className="text-[#58a6ff] hover:underline font-mono">
                    {forkInfo.name}
                  </Link>
                </div>
              )}
            </div>

            {/* GitHub Action buttons: Watch, Fork, Star */}
            <div className="flex items-center gap-2">
              {/* Watch */}
              <button className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition">
                <Eye className="w-3.5 h-3.5 text-[#8b949e]" />
                Watch
                <ChevronDown className="w-3 h-3 text-[#8b949e]" />
              </button>

              {/* Fork */}
              <button 
                onClick={() => {
                  setForkRepoName(repo.name);
                  setForkVisibility("Private");
                  setForkModalOpen(true);
                }}
                className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
                title="Fork repository"
              >
                <GitFork className="w-3.5 h-3.5 text-[#8b949e]" />
                Fork
                <span className="bg-[#30363d] px-1.5 py-0.2 rounded-full text-[10px] text-[#f0f6fc]">
                  {forkInfo ? 2 : 1}
                </span>
              </button>

              {/* Star Button */}
              <button 
                onClick={handleToggleStar}
                className={`border text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition shadow-sm ${
                  isStarred 
                    ? "bg-[#e3b341]/10 border-[#e3b341]/60 text-[#e3b341] hover:bg-[#e3b341]/20" 
                    : "bg-[#21262d] hover:bg-[#30363d] border-[#363b42] text-[#c9d1d9] hover:text-[#f0f6fc]"
                }`}
                title={isStarred ? "Starred by you (click to unstar)" : "Star this repository"}
              >
                <Star className={`w-3.5 h-3.5 ${isStarred ? "text-[#e3b341] fill-[#e3b341]" : "text-[#8b949e]"}`} />
                <span>{isStarred ? "Starred" : "Star"}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono transition ${
                  isStarred ? "bg-[#e3b341]/25 text-[#e3b341] font-bold" : "bg-[#30363d] text-[#f0f6fc]"
                }`}>
                  {starCount}
                </span>
              </button>
            </div>
          </div>

          <p className="text-xs text-[#8b949e] mb-3 max-w-3xl leading-relaxed">
            {repo.description || "Prompt engineering repository for production LLM workflows."}
          </p>

          {/* Author Details & Quick Profile Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3.5 mb-4 bg-[#161b22]/70 border border-[#30363d] rounded-xl text-xs backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <Link 
                href={`/u/${repo.owner_username || 'user'}`}
                className="flex items-center gap-2.5 group hover:opacity-90 transition"
              >
                <div className="relative">
                  <img 
                    src={repo.owner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner_username || repo.owner_name || 'author'}`}
                    alt={repo.owner_name || repo.owner_username || "Author"}
                    className="w-8 h-8 rounded-full border border-[#30363d] group-hover:border-[#58a6ff] object-cover shrink-0 transition"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 bg-[#238636] border border-[#0d1117] w-2.5 h-2.5 rounded-full" title="Active author"></span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#f0f6fc] group-hover:text-[#58a6ff] group-hover:underline transition truncate">
                      {repo.owner_name || repo.owner_username || "Author"}
                    </span>
                    <span className="bg-[#21262d] border border-[#30363d] text-[10px] text-[#58a6ff] px-1.5 py-0.2 rounded font-medium">
                      Author
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8b949e] truncate">
                    @{repo.owner_username || 'user'} · Created {formatRelativeTime(repo.created_at)}
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/u/${repo.owner_username || 'user'}`}
                className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] hover:text-[#f0f6fc] text-xs font-semibold px-3 py-1.5 rounded-md transition flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#8b949e]" />
                <span>View Author Profile</span>
              </Link>
              {user && repo.owner_id && user.id !== repo.owner_id && (
                <button
                  onClick={handleToggleAuthorFollow}
                  disabled={isAuthorFollowLoading}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition flex items-center gap-1.5 shrink-0 ${
                    isAuthorFollowing
                      ? "bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:bg-[#da3633]/20 hover:text-[#f85149]"
                      : "bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm"
                  }`}
                >
                  {isAuthorFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow Author</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sub-nav Tabs (GitHub Tabs: Code, Commits, Compare, Settings) */}
          <div className="flex gap-4 border-b border-transparent text-xs font-semibold overflow-x-auto no-scrollbar">
            <button 
              onClick={() => { setActiveTab("Code"); setIsEditing(false); setAiResult(null); }}
              className={`flex items-center gap-2 pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === "Code" 
                  ? "border-[#f78166] text-[#f0f6fc]" 
                  : "border-transparent text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              <CodeIcon className="w-4 h-4" />
              Code
            </button>

            <button 
              onClick={() => { setActiveTab("Commits"); setIsEditing(false); setAiResult(null); }}
              className={`flex items-center gap-2 pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === "Commits" 
                  ? "border-[#f78166] text-[#f0f6fc]" 
                  : "border-transparent text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              <History className="w-4 h-4" />
              Commits
              <span className="bg-[#21262d] border border-[#30363d] text-[10px] font-mono text-[#8b949e] px-1.5 py-0.2 rounded-full">
                {repo.versions ? repo.versions.length : 1}
              </span>
            </button>

            <button 
              onClick={() => { setActiveTab("Compare"); setIsEditing(false); setAiResult(null); }}
              className={`flex items-center gap-2 pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === "Compare" 
                  ? "border-[#f78166] text-[#f0f6fc]" 
                  : "border-transparent text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              <GitCompare className="w-4 h-4" />
              Compare
            </button>

            <button 
              onClick={() => { setActiveTab("Settings"); setIsEditing(false); setAiResult(null); }}
              className={`flex items-center gap-2 pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === "Settings" 
                  ? "border-[#f78166] text-[#f0f6fc]" 
                  : "border-transparent text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          MAIN BODY
         ======================================================== */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 mt-6">

        {/* ── TAB 1: CODE / PROMPT VIEWER ── */}
        {activeTab === "Code" && (
          <div className="space-y-4">
            
            {/* Action Bar (Branch, Code Dropdown, Edit, AI Optimize) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="bg-[#21262d] border border-[#363b42] rounded-md px-3 py-1.5 text-xs font-semibold text-[#f0f6fc] flex items-center gap-2 cursor-pointer hover:bg-[#30363d]">
                  <GitBranch className="w-3.5 h-3.5 text-[#8b949e]" />
                  main
                  <ChevronDown className="w-3 h-3 text-[#8b949e]" />
                </div>
                
                <span className="text-xs text-[#8b949e] font-mono bg-[#161b22] border border-[#30363d] px-2 py-1 rounded">
                  {activeVersion?.version || "v1.0"}
                </span>

                <span className="text-xs text-[#8b949e]">
                  Category: <b className="text-[#c9d1d9]">{repo.category || "Prompt"}</b>
                </span>
              </div>

              <div className="flex items-center gap-2 relative">
                {!isEditing ? (
                  <>
                    {isOwner ? (
                      <>
                        <button 
                          onClick={startEditing}
                          className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#f0f6fc] text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#8b949e]" />
                          Edit Prompt
                        </button>

                        <button 
                          onClick={optimizePrompt}
                          disabled={optimizing}
                          className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {optimizing ? "Optimizing..." : "Optimize with AI"}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={optimizeInChatbot}
                        className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Optimize with AI
                      </button>
                    )}

                    {/* GitHub Green "<> Code" Dropdown */}
                    <div className="relative">
                      <button 
                        onClick={() => setIsCodeDropdownOpen(!isCodeDropdownOpen)}
                        className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
                      >
                        <CodeIcon className="w-3.5 h-3.5" />
                        Code
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {isCodeDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl p-3 z-30 text-xs">
                          <div className="font-semibold text-[#f0f6fc] mb-2 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-[#58a6ff]" />
                            Clone or Use Prompt
                          </div>
                          
                          <div className="bg-[#0d1117] border border-[#30363d] rounded p-2 mb-3">
                            <div className="text-[10px] text-[#8b949e] mb-1">PromptHub URL</div>
                            <div className="flex items-center justify-between font-mono text-[11px] text-[#c9d1d9] truncate">
                              <span className="truncate">{typeof window !== 'undefined' ? window.location.href : `/repo/${repo.id}`}</span>
                              <button 
                                onClick={handleCopy}
                                className="ml-2 text-[#8b949e] hover:text-white"
                                title="Copy"
                              >
                                {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <button
                              onClick={handleCloneToMyRepos}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[#1f6feb] hover:text-white rounded text-xs text-[#c9d1d9] transition flex items-center gap-2"
                            >
                              <Book className="w-3.5 h-3.5" />
                              <span>Clone to my repositories</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsCodeDropdownOpen(false);
                                setForkRepoName(repo.name);
                                setForkModalOpen(true);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[#1f6feb] hover:text-white rounded text-xs text-[#c9d1d9] transition flex items-center gap-2"
                            >
                              <GitFork className="w-3.5 h-3.5" />
                              <span>Fork this repository</span>
                            </button>

                            <button
                              onClick={() => {
                                handleCopy();
                                setIsCodeDropdownOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[#1f6feb] hover:text-white rounded text-xs text-[#c9d1d9] transition flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy system prompt text</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => { setIsEditing(false); setAiResult(null); }}
                    className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#f0f6fc] text-xs font-semibold px-3 py-1.5 rounded-md transition"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* GitHub Latest Commit Banner Bar */}
            <div className="border border-[#30363d] bg-[#161b22] rounded-t-lg px-4 py-3 flex items-center justify-between text-xs text-[#8b949e]">
              <div className="flex items-center gap-2.5 min-w-0">
                <Link href={`/u/${repo.owner_username || 'user'}`} className="shrink-0">
                  <img 
                    src={repo.owner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner_username || repo.owner_name || 'author'}`}
                    alt={repo.owner_name || repo.owner_username || 'Author'}
                    className="w-5 h-5 rounded-full border border-[#30363d] object-cover hover:border-[#58a6ff] transition"
                  />
                </Link>
                <Link 
                  href={`/u/${repo.owner_username || 'user'}`}
                  className="font-semibold text-[#f0f6fc] hover:text-[#58a6ff] hover:underline cursor-pointer truncate"
                >
                  {repo.owner_username || repo.owner_name || 'Author'}
                </Link>
                <span className="text-[#c9d1d9] truncate font-medium">
                  {latestVersion?.change_description || "Initial prompt commit"}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-[11px] text-[#8b949e] hover:text-[#58a6ff] cursor-pointer">
                  {generateShortSha(latestVersion?.id, latestVersion?.version)}
                </span>
                <span>{formatRelativeTime(latestVersion?.created_at)}</span>
                <button 
                  onClick={() => setActiveTab("Commits")}
                  className="flex items-center gap-1 font-semibold text-[#c9d1d9] hover:text-[#58a6ff] transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{repo.versions?.length || 1} commits</span>
                </button>
              </div>
            </div>

            {/* Prompt File Box (system_prompt.md) */}
            <div className="border border-[#30363d] border-t-0 bg-[#0d1117] rounded-b-lg overflow-hidden shadow-sm">
              
              {/* File Header Bar */}
              <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#8b949e]" />
                  <span className="font-semibold text-[#f0f6fc] font-mono">system_prompt.md</span>
                  <span className="text-[#8b949e]">
                    {promptLines.length} lines ({currentPrompt.length} bytes)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Toggle: Raw vs Preview */}
                  {!isEditing && (
                    <div className="flex border border-[#30363d] rounded overflow-hidden text-[11px]">
                      <button
                        onClick={() => setViewMode("raw")}
                        className={`px-2 py-0.5 font-medium transition ${viewMode === "raw" ? "bg-[#21262d] text-[#f0f6fc]" : "text-[#8b949e] hover:text-[#f0f6fc]"}`}
                      >
                        Code
                      </button>
                      <button
                        onClick={() => setViewMode("preview")}
                        className={`px-2 py-0.5 font-medium transition ${viewMode === "preview" ? "bg-[#21262d] text-[#f0f6fc]" : "text-[#8b949e] hover:text-[#f0f6fc]"}`}
                      >
                        Preview
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={handleCopy}
                    className="text-[#8b949e] hover:text-[#f0f6fc] p-1 hover:bg-[#21262d] rounded transition flex items-center gap-1 text-xs"
                    title="Copy prompt"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#3fb950]" />
                        <span className="text-[#3fb950]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Prompt Content Area */}
              {isEditing ? (
                <div className="p-4 bg-[#0d1117] space-y-4">
                  <textarea 
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={16}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-[#f0f6fc] font-mono text-xs focus:outline-none focus:border-[#58a6ff] resize-y leading-relaxed"
                    placeholder="Enter system prompt instructions..."
                  />

                  {/* GitHub-style Commit Changes Card */}
                  <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-4 shadow-sm">
                    <h3 className="text-xs font-semibold text-[#f0f6fc] mb-3">Commit changes</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-[#8b949e] mb-1">Commit message</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Update system_prompt.md with edge constraints"
                          value={commitTitle}
                          onChange={e => setCommitTitle(e.target.value)}
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#8b949e] mb-1">Extended description (optional)</label>
                        <textarea 
                          rows={2}
                          placeholder="Add an optional extended description..."
                          value={commitDesc}
                          onChange={e => setCommitDesc(e.target.value)}
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
                        />
                      </div>

                      {/* Version Bump selection */}
                      <div className="flex items-center gap-4 text-xs pt-1">
                        <span className="text-[#8b949e]">Version bump:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="radio" 
                            name="bump" 
                            value="patch" 
                            checked={versionBump === "patch"} 
                            onChange={() => setVersionBump("patch")}
                            className="accent-[#1f6feb]"
                          />
                          <span>Patch (e.g. v1.1)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="radio" 
                            name="bump" 
                            value="major" 
                            checked={versionBump === "major"} 
                            onChange={() => setVersionBump("major")}
                            className="accent-[#1f6feb]"
                          />
                          <span>Major (e.g. v2.0)</span>
                        </label>
                      </div>

                      {aiResult && (
                        <div className="border border-[#1b4b27] bg-[#041d11]/80 rounded p-3 text-xs">
                          <div className="flex items-center gap-1.5 text-[#3fb950] font-semibold mb-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Optimization Suggested
                          </div>
                          <ul className="text-[11px] text-[#8b949e] space-y-1 list-disc pl-3">
                            {aiResult.changes ? aiResult.changes.map((c, i) => (
                              <li key={i}>{c}</li>
                            )) : (
                              <li>Refactored clarity and boundary invariants.</li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button 
                          onClick={savePrompt}
                          className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-semibold px-4 py-2 rounded-md transition shadow-sm"
                        >
                          Commit changes
                        </button>
                        <button 
                          onClick={() => { setIsEditing(false); setAiResult(null); }}
                          className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-medium px-3 py-2 rounded-md transition"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : viewMode === "raw" ? (
                /* Raw Monospace View with Line Numbers */
                <div className="flex bg-[#0d1117] text-xs font-mono overflow-x-auto">
                  <div className="select-none py-4 px-3 bg-[#0d1117] text-[#8b949e]/50 text-right border-r border-[#21262d] font-mono min-w-[42px]">
                    {promptLines.map((_, i) => (
                      <div key={i} className="leading-6">{i + 1}</div>
                    ))}
                  </div>
                  <div className="p-4 flex-1 overflow-x-auto">
                    <pre className="text-[#c9d1d9] leading-6 font-mono whitespace-pre-wrap">
                      {currentPrompt}
                    </pre>
                  </div>
                </div>
              ) : (
                /* Rendered Markdown Preview */
                <div className="p-6 bg-[#0d1117] text-xs leading-relaxed space-y-3 prose-invert max-w-none">
                  <div className="border-b border-[#21262d] pb-2 font-bold text-sm text-[#f0f6fc]">
                    System Prompt Preview
                  </div>
                  <pre className="text-[#c9d1d9] font-mono whitespace-pre-wrap leading-relaxed bg-[#161b22] p-4 rounded-lg border border-[#30363d]">
                    {currentPrompt}
                  </pre>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── TAB 2: COMMITS HISTORY (Exact GitHub Commits View) ── */}
        {activeTab === "Commits" && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#8b949e]" />
                <span className="text-xs text-[#8b949e]">Commits on</span>
                <span className="bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded text-xs font-semibold text-[#f0f6fc]">
                  main
                </span>
              </div>
              <span className="text-xs text-[#8b949e]">
                {repo.versions?.length || 1} commit{(repo.versions?.length || 1) > 1 ? "s" : ""}
              </span>
            </div>

            {/* Commits grouped by Date */}
            {Object.keys(commitsByDate).length > 0 ? (
              Object.entries(commitsByDate).map(([dateLabel, versions]) => (
                <div key={dateLabel} className="space-y-2">
                  
                  {/* Date Header Banner */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#8b949e]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Commits on {dateLabel}</span>
                  </div>

                  {/* Commits Container Box */}
                  <div className="border border-[#30363d] bg-[#0d1117] rounded-lg divide-y divide-[#21262d] overflow-hidden">
                    {versions.map((ver) => {
                      const shortSha = generateShortSha(ver.id, ver.version);
                      return (
                        <div 
                          key={ver.id} 
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#161b22]/60 transition group"
                        >
                          {/* Commit Message & Author */}
                          <div className="flex items-start gap-3 min-w-0">
                            <Link href={`/u/${repo.owner_username || 'user'}`} className="shrink-0 mt-0.5">
                              <img 
                                src={repo.owner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner_username || repo.owner_name || 'author'}`}
                                alt={repo.owner_name || repo.owner_username || 'Author'}
                                className="w-6 h-6 rounded-full border border-[#30363d] object-cover hover:border-[#58a6ff] transition"
                              />
                            </Link>

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#f0f6fc] group-hover:text-[#58a6ff] transition truncate">
                                {ver.change_description || `Updated prompt to ${ver.version}`}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-[#8b949e] mt-1 flex-wrap">
                                <Link 
                                  href={`/u/${repo.owner_username || 'user'}`}
                                  className="font-medium text-[#c9d1d9] hover:text-[#58a6ff] hover:underline cursor-pointer"
                                >
                                  {repo.owner_username || repo.owner_name || "Author"}
                                </Link>
                                <span>committed {formatRelativeTime(ver.created_at)}</span>
                                <span className="bg-[#161b22] border border-[#30363d] text-[10px] font-mono px-1.5 py-0.2 rounded text-[#58a6ff]">
                                  {ver.version}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Action Buttons: Short SHA, Copy, View Code */}
                          <div className="flex items-center gap-2 shrink-0 sm:self-center">
                            {/* Short Commit Hash */}
                            <span 
                              className="font-mono text-xs text-[#58a6ff] bg-[#161b22] border border-[#30363d] px-2 py-1 rounded"
                              title={`Commit ${ver.id}`}
                            >
                              {shortSha}
                            </span>

                            {/* Copy Commit SHA */}
                            <button
                              onClick={() => handleCopySha(ver.id, ver.id)}
                              className="p-1 text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d] hover:bg-[#21262d] rounded transition"
                              title="Copy full SHA"
                            >
                              {copiedSha === ver.id ? (
                                <Check className="w-3.5 h-3.5 text-[#3fb950]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* View Prompt Code at this commit */}
                            <button
                              onClick={() => {
                                setActiveVersion(ver);
                                setCurrentPrompt(ver.content);
                                setActiveTab("Code");
                              }}
                              className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-xs font-semibold text-[#f0f6fc] px-3 py-1 rounded transition flex items-center gap-1.5"
                              title="Browse prompt at this version"
                            >
                              <CodeIcon className="w-3 h-3 text-[#8b949e]" />
                              <span>View</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))
            ) : (
              <div className="text-center py-12 text-[#8b949e] border border-[#30363d] border-dashed rounded-lg bg-[#0d1117]">
                No commit history recorded yet.
              </div>
            )}

          </div>
        )}

        {/* ── TAB 3: COMPARE VERSIONS ── */}
        {activeTab === "Compare" && (
          <div className="space-y-4">
            <div className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-xs text-[#8b949e]">Base:</span>
                <select 
                  value={compareA} 
                  onChange={e => setCompareA(e.target.value)} 
                  className="bg-[#0d1117] border border-[#30363d] rounded p-1.5 text-xs text-[#f0f6fc] flex-1 focus:outline-none"
                >
                  <option value="">Select Version A</option>
                  {repo.versions && repo.versions.map(v => (
                    <option key={v.id} value={v.id}>{v.version} - {v.change_description}</option>
                  ))}
                </select>
              </div>

              <span className="text-[#8b949e] font-bold">← compare →</span>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-xs text-[#8b949e]">Compare:</span>
                <select 
                  value={compareB} 
                  onChange={e => setCompareB(e.target.value)} 
                  className="bg-[#0d1117] border border-[#30363d] rounded p-1.5 text-xs text-[#f0f6fc] flex-1 focus:outline-none"
                >
                  <option value="">Select Version B</option>
                  {repo.versions && repo.versions.map(v => (
                    <option key={v.id} value={v.id}>{v.version} - {v.change_description}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleCompare} 
                disabled={!compareA || !compareB}
                className="bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded transition"
              >
                Compare Versions
              </button>
            </div>

            {compareResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
                  <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 font-mono text-xs font-semibold text-[#f0f6fc]">
                    {compareResult.version_a.version}
                  </div>
                  <pre className="p-4 font-mono text-xs text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">
                    {compareResult.version_a.content}
                  </pre>
                </div>
                <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
                  <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 font-mono text-xs font-semibold text-[#f0f6fc]">
                    {compareResult.version_b.version}
                  </div>
                  <pre className="p-4 font-mono text-xs text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">
                    {compareResult.version_b.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: SETTINGS (Includes Public / Private Visibility Toggle) ── */}
        {activeTab === "Settings" && (
          <div className="max-w-3xl space-y-8">
            
            {/* General Settings */}
            <div className="border border-[#30363d] bg-[#0d1117] rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[#f0f6fc] border-b border-[#21262d] pb-2">
                General Settings
              </h2>
              
              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">Repository Name</label>
                <input 
                  type="text"
                  disabled
                  value={repo.name}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-[#c9d1d9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">Category</label>
                <input 
                  type="text"
                  disabled
                  value={repo.category || "Other"}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-[#c9d1d9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">Description</label>
                <textarea 
                  disabled
                  value={repo.description || ""}
                  rows={2}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-[#c9d1d9]"
                />
              </div>
            </div>

            {/* Danger Zone: Change Visibility (Public <-> Private) */}
            <div className="border border-[#da3633]/60 bg-[#0d1117] rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[#f85149] border-b border-[#da3633]/30 pb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#f85149]" />
                Danger Zone
              </h2>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-[#da3633]/20 pb-4 mb-4">
                <div>
                  <h3 className="text-xs font-semibold text-[#f0f6fc]">
                    Change repository visibility
                  </h3>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    This repository is currently <b className="text-[#f0f6fc]">{repo.visibility || "Public"}</b>.
                    {repo.visibility === "Public" 
                      ? " Making it private will restrict access to only you." 
                      : " Making it public will make it visible to anyone on the internet and community."}
                  </p>
                </div>

                <button
                  onClick={() => setVisibilityModalOpen(true)}
                  className="bg-[#21262d] hover:bg-[#da3633]/20 border border-[#da3633]/60 text-[#f85149] hover:text-white text-xs font-semibold px-4 py-2 rounded-md transition whitespace-nowrap"
                >
                  Change to {repo.visibility === "Public" ? "Private" : "Public"}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 py-2">
                <div>
                  <h3 className="text-xs font-semibold text-[#f0f6fc]">
                    Delete this repository
                  </h3>
                  <p className="text-xs text-[#8b949e] mt-0.5 max-w-lg">
                    Once you delete a repository, there is no going back. Please be certain.
                  </p>
                </div>

                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="bg-[#21262d] hover:bg-[#da3633] border border-[#da3633]/60 text-[#f85149] hover:text-white text-xs font-semibold px-4 py-2 rounded-md transition whitespace-nowrap"
                >
                  Delete repository
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================
          DELETE CONFIRMATION MODAL
         ======================================================== */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#da3633]/60 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-base font-semibold text-[#f0f6fc] flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-[#f85149]" />
              Delete repository
            </h2>

            <div className="bg-[#f85149]/10 border border-[#f85149]/30 rounded-md p-3 mb-4">
              <p className="text-xs text-[#f0f6fc] leading-relaxed">
                This action <strong>cannot</strong> be undone. This will permanently delete the 
                <b className="font-mono bg-[#0d1117] px-1 rounded mx-1">{repo.owner_username || repo.owner_name}/{repo.name}</b> 
                repository, its prompt history, and all versions.
              </p>
            </div>
            
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
              Please type <b className="font-mono bg-[#0d1117] px-1 rounded">{repo.owner_username || repo.owner_name}/{repo.name}</b> to confirm.
            </label>
            <input 
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#da3633] mb-4"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText(""); }}
                className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-medium px-4 py-2 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRepository}
                disabled={isDeleting || deleteConfirmText !== `${repo.owner_username || repo.owner_name}/${repo.name}`}
                className="bg-[#da3633] hover:bg-[#b62324] text-white text-xs font-semibold px-4 py-2 rounded-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>I understand the consequences, delete this repository</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VISIBILITY CONFIRMATION MODAL (Public <-> Private)
         ======================================================== */}
      {visibilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-base font-semibold text-[#f0f6fc] flex items-center gap-2 mb-2">
              {repo.visibility === "Public" ? (
                <>
                  <Lock className="w-5 h-5 text-[#e3b341]" />
                  Make this repository private
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5 text-[#3fb950]" />
                  Make this repository public
                </>
              )}
            </h2>

            <p className="text-xs text-[#8b949e] mb-4 leading-relaxed">
              {repo.visibility === "Public" ? (
                <>
                  You are changing the visibility of <b className="text-[#f0f6fc]">{repo.name}</b> to <b>Private</b>. 
                  Only you will be able to see this repository and commit new prompt versions.
                </>
              ) : (
                <>
                  You are changing the visibility of <b className="text-[#f0f6fc]">{repo.name}</b> to <b>Public</b>. 
                  Anyone on PromptHub will be able to view, search, and fork this prompt.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#30363d]">
              <button
                onClick={() => setVisibilityModalOpen(false)}
                className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-medium px-4 py-2 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleVisibility}
                disabled={isUpdatingVisibility}
                className={`text-xs font-semibold px-4 py-2 rounded-md flex items-center gap-1.5 transition disabled:opacity-50 ${
                  repo.visibility === "Public" 
                    ? "bg-[#da3633] hover:bg-[#b62324] text-white" 
                    : "bg-[#238636] hover:bg-[#2ea043] text-white"
                }`}
              >
                {isUpdatingVisibility ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>I understand, make {repo.visibility === "Public" ? "Private" : "Public"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FORK REPOSITORY MODAL
         ======================================================== */}
      {forkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-base font-semibold text-[#f0f6fc] flex items-center gap-2 mb-2">
              <GitFork className="w-5 h-5 text-[#58a6ff]" />
              Create a new fork
            </h2>
            <p className="text-xs text-[#8b949e] mb-5">
              A fork is a copy of a repository. Forking allows you to freely experiment with and enhance this prompt without affecting the original repository.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-1.5">Repository name</label>
                <input
                  type="text"
                  value={forkRepoName}
                  onChange={(e) => setForkRepoName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-2">Visibility</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#c9d1d9]">
                    <input
                      type="radio"
                      name="repo_fork_vis"
                      value="Private"
                      checked={forkVisibility === "Private"}
                      onChange={() => setForkVisibility("Private")}
                      className="accent-[#1f6feb]"
                    />
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#8b949e]" />
                      <span className="font-medium text-[#f0f6fc]">Private</span>
                      <span className="text-[11px] text-[#8b949e]">(Default - Only you can see this repo)</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#c9d1d9]">
                    <input
                      type="radio"
                      name="repo_fork_vis"
                      value="Public"
                      checked={forkVisibility === "Public"}
                      onChange={() => setForkVisibility("Public")}
                      className="accent-[#1f6feb]"
                    />
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#3fb950]" />
                      <span className="font-medium text-[#f0f6fc]">Public</span>
                      <span className="text-[11px] text-[#8b949e]">(Anyone can view and fork)</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#30363d]">
              <button
                onClick={() => setForkModalOpen(false)}
                className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-medium px-4 py-2 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteFork}
                disabled={forking}
                className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-semibold px-4 py-2 rounded-md flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                {forking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating fork...</span>
                  </>
                ) : (
                  <>
                    <GitFork className="w-3.5 h-3.5" />
                    <span>Create fork</span>
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
