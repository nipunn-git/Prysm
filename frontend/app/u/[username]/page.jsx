"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Book, 
  Heart, 
  Users, 
  MapPin, 
  Link as LinkIcon, 
  Twitter, 
  Building, 
  GitMerge, 
  Loader2, 
  UserPlus, 
  UserCheck, 
  Share2, 
  Check, 
  Sparkles,
  Edit3,
  Calendar,
  Lock,
  ArrowUpRight,
  SlidersHorizontal,
  Compass
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { API_URL } from "../../../lib/api";
import { getCachedData, setCachedData, findUserInCache, cacheUser } from "../../../lib/cache";
import UserListModal from "../../../components/UserListModal";
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

export default function PublicProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { isDark } = useTheme();

  const [profileUser, setProfileUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [contributions, setContributions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [activeTab, setActiveTab] = useState("prompts"); // "prompts" | "activity"
  const [userListModalOpen, setUserListModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('followers');

  const isOwnProfile = Boolean(
    currentUser && 
    profileUser && 
    (
      currentUser.id === profileUser.id || 
      (currentUser.username && profileUser.username && currentUser.username.toLowerCase() === profileUser.username.toLowerCase())
    )
  );

  useEffect(() => {
    let isCancelled = false;

    async function fetchPublicProfile() {
      // 0ms instant display check
      const currentCache = findUserInCache(username);
      if (currentCache && !profileUser) {
        setProfileUser(currentCache);
        setLoading(false);
        setIsFollowing(Boolean(currentCache.is_following));
        setFollowersCount(currentCache.followers_count || 0);
        setFollowingCount(currentCache.following_count || 0);
      } else if (!currentCache && !profileUser) {
        setLoading(true);
      }
      setError(null);

      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      if (currentUser?.id) {
        headers['X-User-Id'] = currentUser.id;
      }

      // Decoupled, independent fetching with background SWR
      const userPromise = fetch(
        `${API_URL}/api/auth/users/${encodeURIComponent(username)}${storedToken ? `?token=${encodeURIComponent(storedToken)}` : ''}`,
        { headers }
      )
        .then(async (res) => {
          if (isCancelled) return;
          if (res.ok) {
            const userData = await res.json();
            if (isCancelled) return;
            setProfileUser(userData);
            cacheUser(userData);
            setIsFollowing(Boolean(userData.is_following));
            setFollowersCount(userData.followers_count || 0);
            setFollowingCount(userData.following_count || 0);
            setLoading(false);
          } else if (!currentCache && !profileUser) {
            setError("User not found");
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error("Profile fetch error:", err);
          if (!currentCache && !profileUser) {
            setError("Failed to load user profile");
            setLoading(false);
          }
        });

      const reposPromise = fetch(
        `${API_URL}/api/repositories/user/${encodeURIComponent(username)}${storedToken ? `?token=${encodeURIComponent(storedToken)}` : ''}`,
        { headers }
      )
        .then(async (res) => {
          if (isCancelled) return;
          if (res.ok) {
            const repoData = await res.json();
            if (isCancelled) return;
            setRepos(repoData);
            setCachedData(`public_repos_${username}`, repoData);
          }
        })
        .catch((err) => console.error("Repos fetch error:", err));

      const contribPromise = fetch(
        `${API_URL}/api/auth/users/${encodeURIComponent(username)}/contributions`
      )
        .then(async (res) => {
          if (isCancelled) return;
          if (res.ok) {
            const contribData = await res.json();
            if (isCancelled) return;
            setContributions(contribData);
            setCachedData(`public_contrib_${username}`, contribData);
          }
        })
        .catch((err) => console.error("Contributions fetch error:", err));

      await Promise.allSettled([userPromise, reposPromise, contribPromise]);
      if (!isCancelled) setLoading(false);
    }

    fetchPublicProfile();

    return () => {
      isCancelled = true;
    };
  }, [username, currentUser?.id]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (isOwnProfile || isFollowLoading || !profileUser) return;

    // 0ms Optimistic Update
    const prevFollowing = isFollowing;
    const prevCount = followersCount;
    const nextFollowing = !prevFollowing;

    setIsFollowing(nextFollowing);
    setFollowersCount(Math.max(0, prevCount + (nextFollowing ? 1 : -1)));
    setIsFollowLoading(true);

    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = currentUser?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      
      const headers = {
        ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
        ...(effectiveUserId ? { 'X-User-Id': effectiveUserId } : {})
      };
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (effectiveUserId) queryParams.set('user_id', effectiveUserId);

      const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(profileUser.id)}/follow?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(Boolean(data.following));
        if (typeof data.followers_count === 'number') {
          setFollowersCount(data.followers_count);
        }
      } else {
        // Rollback on non-200
        setIsFollowing(prevFollowing);
        setFollowersCount(prevCount);
      }
    } catch (e) {
      console.error("Follow error:", e);
      // Rollback on error
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profileUser?.name || profileUser?.username} on Prysm`,
          text: `Check out ${profileUser?.name}'s AI prompt repositories on Prysm.`,
          url: window.location.href,
        });
        return;
      }
    } catch {
      // User cancelled share or unsupported, fallback to clipboard
    }
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleToggleStar = async (e, repoId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // 0ms Optimistic Update
    setRepos(prev => prev.map(r => {
      if (r.id === repoId) {
        const nextStarred = !r.is_starred;
        const nextCount = Math.max(0, (r.stars_count || 0) + (nextStarred ? 1 : -1));
        return { ...r, is_starred: nextStarred, stars_count: nextCount };
      }
      return r;
    }));

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-apple">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <span className="text-xs text-neutral-400">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 font-apple relative">
        <GridPulse cell={28} reach={2.8} ambient={3} className="opacity-35 dark:opacity-20 pointer-events-none fixed inset-0 z-0" />
        <div className="relative z-10 max-w-sm flex flex-col items-center p-8 rounded-3xl bg-white/70 dark:bg-[#121620]/70 backdrop-blur-2xl border border-neutral-200/80 dark:border-white/10 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center mb-4 text-neutral-400">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">User not found</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            The profile @{username} doesn&apos;t exist or could not be found.
          </p>
          <Link 
            href="/explore" 
            className="inline-flex items-center gap-2 bg-[#1d1d1f] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black px-5 py-2.5 rounded-full text-xs font-medium transition shadow-sm"
          >
            <Compass className="w-4 h-4" />
            Explore Community
          </Link>
        </div>
      </div>
    );
  }

  const targetUsername = (profileUser?.username || '').toLowerCase();
  const specialRepo = (Array.isArray(repos) ? repos : []).find(r => r?.name && r.name.toLowerCase() === targetUsername);
  const publicRepos = (Array.isArray(repos) ? repos : []).filter(r => r?.name && r.name.toLowerCase() !== targetUsername);

  const totalContributions = contributions?.total_contributions || 0;
  const recentActivities = contributions?.recent_activities || [];
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

  const levelColors = isDark ? LEVEL_COLORS_DARK : LEVEL_COLORS_LIGHT;

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
            <div className="relative mb-5 inline-block">
              <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full ring-4 ${isDark ? "ring-[#05070c] bg-neutral-900" : "ring-white bg-neutral-100"} shadow-2xl overflow-hidden flex items-center justify-center relative`}>
                {profileUser.avatar ? (
                  <img 
                    src={profileUser.avatar} 
                    alt={`${profileUser.username}'s Avatar`} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900">
                    <span className="text-5xl font-semibold tracking-tight text-neutral-600 dark:text-neutral-300">
                      {profileUser.name?.charAt(0)?.toUpperCase() || profileUser.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Name & Username (ID strictly removed) */}
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-tight">
                {profileUser.name || profileUser.username}
              </h1>
              <span className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 font-normal block mt-0.5">
                @{profileUser.username}
              </span>
            </div>

            {/* Social Action Buttons: Follow & Share */}
            <div className="flex items-center gap-2.5 mb-5">
              {isOwnProfile ? (
                <Link
                  href="/profile"
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 border border-neutral-200/80 dark:border-white/10 text-neutral-900 dark:text-white text-xs font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </Link>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  className={`flex-1 text-xs font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${
                    isFollowing 
                      ? "bg-neutral-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:bg-white/10 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 dark:hover:text-red-400 border border-neutral-200/80 dark:border-white/10 text-neutral-800 dark:text-neutral-200"
                      : "bg-[#1d1d1f] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold"
                  }`}
                >
                  {isFollowing ? (
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

              <button
                onClick={handleShare}
                title="Share profile"
                className="p-2.5 bg-white/70 dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/15 border border-neutral-200/80 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 transition-all shadow-sm"
              >
                {copiedShare ? (
                  <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in-50" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Bio */}
            {profileUser.bio && (
              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 mb-5 leading-relaxed bg-white/60 dark:bg-white/[0.04] backdrop-blur-md p-3.5 rounded-xl border border-neutral-200/70 dark:border-white/[0.06] shadow-sm">
                {profileUser.bio}
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
                <span className="font-semibold text-neutral-900 dark:text-white">{followersCount}</span>
                <span className="group-hover/stat:underline">followers</span>
              </div>
              <span>·</span>
              <div 
                onClick={() => { setModalTab('following'); setUserListModalOpen(true); }}
                className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition group/stat"
                title="View following"
              >
                <span className="font-semibold text-neutral-900 dark:text-white">{followingCount}</span>
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
              {profileUser.company && (
                <li className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">{profileUser.company}</span>
                </li>
              )}
              {profileUser.location && (
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300">{profileUser.location}</span>
                </li>
              )}
              {profileUser.website && (
                <li className="flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  <a 
                    href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-500 hover:underline truncate"
                  >
                    {profileUser.website}
                  </a>
                </li>
              )}
              {profileUser.twitter && (
                <li className="flex items-center gap-2">
                  <Twitter className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  <a 
                    href={`https://twitter.com/${profileUser.twitter.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-500 hover:underline"
                  >
                    @{profileUser.twitter.replace('@', '')}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Joined {new Date(profileUser.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              </li>
            </ul>

          </div>

          {/* Right Column: Profile Navigation & Content */}
          <div className="flex-1 min-w-0 pt-2">
            
            {/* Social Profile Navigation Tabs - Apple Segmented Glass Bar */}
            <div className="flex items-center gap-2 p-1 bg-neutral-200/50 dark:bg-white/[0.06] backdrop-blur-xl rounded-xl border border-neutral-200/60 dark:border-white/[0.06] mb-6 w-fit">
              <button
                onClick={() => setActiveTab("prompts")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeTab === "prompts"
                    ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Book className="w-3.5 h-3.5" />
                Prompts
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === "prompts" 
                    ? "bg-neutral-100 dark:bg-white/20 text-neutral-800 dark:text-white" 
                    : "bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-neutral-400"
                }`}>
                  {publicRepos.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeTab === "activity"
                    ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Activity & History
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === "activity" 
                    ? "bg-neutral-100 dark:bg-white/20 text-neutral-800 dark:text-white" 
                    : "bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-neutral-400"
                }`}>
                  {totalContributions}
                </span>
              </button>
            </div>

            {/* Special Profile README (Hero Card) */}
            {specialRepo && (
              <div className="mb-8 border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl overflow-hidden shadow-sm">
                <div className="bg-neutral-100/60 dark:bg-white/[0.04] px-4 py-3 border-b border-neutral-200/80 dark:border-white/[0.08] text-xs font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-neutral-200 dark:bg-white/10 px-2 py-0.5 rounded-md font-semibold text-neutral-800 dark:text-neutral-200">
                      {profileUser.username}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">/ README.md</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">Personal Prompt Bio</span>
                </div>
                <div className="p-6 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 prose prose-neutral dark:prose-invert max-w-none">
                  {specialRepo.latest_prompt ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {specialRepo.latest_prompt}
                    </ReactMarkdown>
                  ) : (
                    <p>Welcome to my Prysm profile.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: Prompts */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                {publicRepos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {publicRepos.map((repo) => (
                      <div 
                        key={repo.id}
                        onClick={() => router.push(`/repo/${repo.id}`)}
                        className="group flex flex-col justify-between border border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 rounded-2xl p-5 bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Book className="w-4 h-4 text-neutral-400 shrink-0" />
                              <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate group-hover:text-blue-500 transition">
                                {repo.name}
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleToggleStar(e, repo.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                repo.is_starred 
                                  ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400"
                                  : "bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 border-neutral-200/70 dark:border-white/10 text-neutral-500 dark:text-neutral-400"
                              }`}
                              title={repo.is_starred ? "Liked" : "Like"}
                            >
                              <Heart className={`w-3 h-3 ${repo.is_starred ? "fill-rose-500 text-rose-500" : ""}`} />
                              <span>{repo.stars_count || 0}</span>
                            </button>
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
                            <span className="font-mono bg-neutral-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-neutral-600 dark:text-neutral-300">
                              {repo.latest_version || 'v1.0'}
                            </span>
                            <span className="text-[11px] text-neutral-400 group-hover:text-blue-500 flex items-center gap-0.5 transition">
                              Optimize <ArrowUpRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-neutral-300 dark:border-white/15 rounded-2xl p-12 text-center bg-white/40 dark:bg-white/[0.02] backdrop-blur-md">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                      <Book className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1 text-neutral-900 dark:text-white">No public prompts yet</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-5">
                      @{profileUser.username} hasn&apos;t published any prompt repositories yet.
                    </p>
                    {isOwnProfile && (
                      <Link 
                        href="/new"
                        className="inline-flex items-center gap-1.5 bg-[#1d1d1f] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black px-4 py-2 rounded-xl text-xs font-medium transition shadow-sm"
                      >
                        Create your first prompt
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Activity */}
            {activeTab === "activity" && (
              <div className="space-y-6">
                {recentActivities.length > 0 ? (
                  <div className="border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl bg-white/70 dark:bg-[#121620]/70 backdrop-blur-xl divide-y divide-neutral-200/60 dark:divide-white/[0.06] overflow-hidden shadow-sm">
                    {recentActivities.map((act, index) => (
                      <div key={index} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-blue-500 shrink-0">
                            {act.type === "repo_created" ? <Book className="w-4 h-4" /> : <GitMerge className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                              {act.description}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              in <Link href={`/repo/${act.repo_id}`} className="text-blue-500 hover:underline font-mono">{act.repo_name}</Link>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                          {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-neutral-400 border border-dashed border-neutral-200/80 dark:border-white/10 rounded-2xl">
                    No recent activity recorded.
                  </div>
                )}
              </div>
            )}

            {/* Contribution Activity Heatmap */}
            <div className="mt-10">
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

          </div>

        </div>

      </div>

      {/* Followers & Following Modal */}
      <UserListModal
        isOpen={userListModalOpen}
        onClose={() => setUserListModalOpen(false)}
        targetUser={profileUser}
        initialTab={modalTab}
        currentUser={currentUser}
      />
    </div>
  );
}