"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Book, 
  Star, 
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
  Compass
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useAuth } from "../../../context/AuthContext";
import { API_URL } from "../../../lib/api";
import { getCachedData, setCachedData, findUserInCache, cacheUser } from "../../../lib/cache";
import UserListModal from "../../../components/UserListModal";

const LEVEL_COLORS = [
  "bg-[#161b22]",   // level 0 - no contributions
  "bg-[#0e4429]",   // level 1
  "bg-[#006d32]",   // level 2
  "bg-[#26a641]",   // level 3
  "bg-[#39d353]",   // level 4
];

export default function PublicProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const cachedUser = findUserInCache(username);
  const cachedRepos = getCachedData(`public_repos_${username}`, []);
  const cachedContrib = getCachedData(`public_contrib_${username}`, null);

  const [profileUser, setProfileUser] = useState(cachedUser);
  const [repos, setRepos] = useState(cachedRepos);
  const [contributions, setContributions] = useState(cachedContrib);
  const [loading, setLoading] = useState(!cachedUser);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(Boolean(cachedUser?.is_following));
  const [followersCount, setFollowersCount] = useState(cachedUser?.followers_count || 0);
  const [followingCount, setFollowingCount] = useState(cachedUser?.following_count || 0);
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

      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      if (currentUser?.id) {
        headers['X-User-Id'] = currentUser.id;
      }

      // Decoupled, independent fetching with background SWR so UI is never blocked
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
          } else if (!cachedUser && !profileUser) {
            setError("User not found");
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error("Profile fetch error:", err);
          if (!cachedUser && !profileUser) {
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
    if (isOwnProfile || isFollowLoading) return;

    setIsFollowLoading(true);
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const headers = {
        ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
        ...(currentUser?.id ? { 'X-User-Id': currentUser.id } : {})
      };
      const queryParams = new URLSearchParams();
      if (storedToken) queryParams.set('token', storedToken);
      if (currentUser?.id) queryParams.set('user_id', currentUser.id);

      const res = await fetch(`${API_URL}/api/auth/users/${encodeURIComponent(profileUser.id)}/follow?${queryParams.toString()}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
        setFollowersCount(data.followers_count);
      }

    } catch (e) {
      console.error("Follow error:", e);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleToggleStar = async (e, repoId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8b949e]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-[#010409]">
        <div className="w-16 h-16 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-4 text-[#8b949e]">
          <Users className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-[#f0f6fc] mb-2">User not found</h1>
        <p className="text-[#8b949e] mb-6 max-w-sm">
          The user @{username} doesn&apos;t exist or could not be found.
        </p>
        <Link 
          href="/explore" 
          className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          Explore Community
        </Link>
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

  return (
    <div className="min-h-screen bg-[#010409] text-[#c9d1d9] pb-24">
      
      {/* Social Media Cover Banner */}
      <div className="w-full h-44 sm:h-56 bg-gradient-to-r from-[#1f6feb]/20 via-[#238636]/15 to-[#8957e5]/20 border-b border-[#21262d] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#30363d_1px,transparent_1px)] [background-size:16px_16px] opacity-25"></div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Profile Card Header */}
        <div className="flex flex-col md:flex-row gap-8 -mt-20 sm:-mt-24 mb-8">
          
          {/* Left Column: Avatar & Profile Info */}
          <div className="w-full md:w-[296px] shrink-0">
            <div className="relative mb-4 inline-block">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-[#010409] bg-[#161b22] overflow-hidden flex items-center justify-center shadow-xl relative">
                {profileUser.avatar ? (
                  <img 
                    src={profileUser.avatar} 
                    alt={`${profileUser.username}'s Avatar`} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl font-bold text-[#8b949e]">
                    {profileUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="absolute bottom-2 right-2 bg-[#161b22] border border-[#30363d] rounded-full p-2 shadow-md z-10" title="Status">
                <span className="text-xl">{profileUser.status_emoji || '🎯'}</span>
              </div>
            </div>

            {/* Name & Username */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-[#f0f6fc] leading-tight flex items-center gap-2">
                {profileUser.name}
              </h1>
              <span className="text-base text-[#8b949e] font-normal block">
                @{profileUser.username}
              </span>
              <span className="text-[11px] text-[#484f58] font-mono mt-0.5 block">
                ID: {profileUser.id}
              </span>
            </div>

            {/* Social Action Buttons: Follow & Share */}
            <div className="flex items-center gap-2 mb-5">
              {isOwnProfile ? (
                <Link
                  href="/profile"
                  className="flex-1 bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#f0f6fc] text-xs font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit profile
                </Link>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  className={`flex-1 text-xs font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${
                    isFollowing 
                      ? "bg-[#21262d] hover:bg-red-950/40 hover:border-red-700/60 hover:text-red-400 border border-[#363b42] text-[#c9d1d9]"
                      : "bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043]"
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
                className="p-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#8b949e] rounded-lg text-[#8b949e] hover:text-[#f0f6fc] transition"
              >
                {copiedShare ? (
                  <Check className="w-4 h-4 text-[#3fb950]" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Bio */}
            {profileUser.bio && (
              <p className="text-sm text-[#c9d1d9] mb-5 leading-relaxed bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                {profileUser.bio}
              </p>
            )}

            {/* Follower Stats */}
            <div className="flex items-center gap-4 text-xs mb-5 text-[#8b949e] pb-5 border-b border-[#21262d]">
              <div 
                onClick={() => { setModalTab('followers'); setUserListModalOpen(true); }}
                className="flex items-center gap-1.5 hover:text-[#58a6ff] cursor-pointer transition group/stat"
                title="View followers"
              >
                <Users className="w-3.5 h-3.5 group-hover/stat:text-[#58a6ff]" />
                <span className="font-bold text-[#f0f6fc] group-hover/stat:text-[#58a6ff]">{followersCount}</span>
                <span className="group-hover/stat:underline">followers</span>
              </div>
              <span>·</span>
              <div 
                onClick={() => { setModalTab('following'); setUserListModalOpen(true); }}
                className="flex items-center gap-1.5 hover:text-[#58a6ff] cursor-pointer transition group/stat"
                title="View following"
              >
                <span className="font-bold text-[#f0f6fc] group-hover/stat:text-[#58a6ff]">{followingCount}</span>
                <span className="group-hover/stat:underline">following</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5 text-[#8b949e]">
                <Book className="w-3.5 h-3.5" />
                <span className="font-bold text-[#f0f6fc]">{repos.length}</span>
                <span>prompts</span>
              </div>
            </div>

            {/* Metadata list */}
            <ul className="text-xs space-y-2.5 text-[#8b949e]">
              {profileUser.company && (
                <li className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                  <span className="text-[#c9d1d9] font-medium">{profileUser.company}</span>
                </li>
              )}
              {profileUser.location && (
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                  <span className="text-[#c9d1d9]">{profileUser.location}</span>
                </li>
              )}
              {profileUser.website && (
                <li className="flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                  <a 
                    href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#58a6ff] hover:underline truncate"
                  >
                    {profileUser.website}
                  </a>
                </li>
              )}
              {profileUser.twitter && (
                <li className="flex items-center gap-2">
                  <Twitter className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                  <a 
                    href={`https://twitter.com/${profileUser.twitter.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#58a6ff] hover:underline"
                  >
                    @{profileUser.twitter.replace('@', '')}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2 text-[#484f58]">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Joined {new Date(profileUser.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              </li>
            </ul>

          </div>

          {/* Right Column: Profile Navigation & Tabs */}
          <div className="flex-1 min-w-0 pt-2">
            
            {/* Social Profile Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#21262d] mb-6">
              <button
                onClick={() => setActiveTab("prompts")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
                  activeTab === "prompts"
                    ? "border-[#f78166] text-[#f0f6fc]"
                    : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                <Book className="w-4 h-4" />
                Prompts
                <span className="ml-1 text-xs bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded-full font-mono">
                  {publicRepos.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
                  activeTab === "activity"
                    ? "border-[#f78166] text-[#f0f6fc]"
                    : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Activity & History
                <span className="ml-1 text-xs bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded-full font-mono">
                  {totalContributions}
                </span>
              </button>
            </div>

            {/* Special Profile README (Hero Card) */}
            {specialRepo && (
              <div className="mb-8 border border-[#30363d] rounded-xl bg-[#0d1117] overflow-hidden shadow-sm">
                <div className="bg-[#161b22] px-4 py-2.5 border-b border-[#30363d] text-xs font-medium text-[#c9d1d9] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-[#21262d] px-1.5 py-0.5 rounded border border-[#30363d] font-semibold text-[#58a6ff]">
                      {profileUser.username}
                    </span>
                    <span>/ README.md</span>
                  </div>
                  <span className="text-[10px] text-[#8b949e]">Personal Prompt Bio</span>
                </div>
                <div className="p-6 text-sm text-[#c9d1d9] prose prose-invert prose-sm max-w-none prose-a:text-[#58a6ff] prose-a:no-underline hover:prose-a:underline prose-headings:border-b prose-headings:border-[#30363d] prose-headings:pb-2 prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-[#30363d]">
                  {specialRepo.latest_prompt ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {specialRepo.latest_prompt}
                    </ReactMarkdown>
                  ) : (
                    <p>Hello! Welcome to my PromptHub profile.</p>
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
                        className="border border-[#30363d] hover:border-[#8b949e]/60 rounded-xl p-5 bg-[#0d1117] transition cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Book className="w-4 h-4 text-[#8b949e] shrink-0" />
                              <span className="text-sm font-semibold text-[#58a6ff] group-hover:underline">
                                {repo.name}
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleToggleStar(e, repo.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition ${
                                repo.is_starred 
                                  ? "bg-[#e3b341]/10 border-[#e3b341]/40 text-[#e3b341]"
                                  : "bg-[#161b22] hover:bg-[#21262d] border-[#30363d] text-[#8b949e]"
                              }`}
                            >
                              <Star className={`w-3 h-3 ${repo.is_starred ? "fill-[#e3b341]" : ""}`} />
                              <span>{repo.stars_count || 0}</span>
                            </button>
                          </div>
                          <p className="text-xs text-[#8b949e] mb-4 line-clamp-2 leading-relaxed">
                            {repo.description || "Prompt repository"}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#8b949e] pt-3 border-t border-[#21262d]">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              repo.category === 'Coding' ? 'bg-[#3178c6]' :
                              repo.category === 'Research' ? 'bg-[#238636]' :
                              repo.category === 'Writing' ? 'bg-[#a371f7]' :
                              repo.category === 'Education' ? 'bg-[#e3b341]' :
                              'bg-[#8b949e]'
                            }`}></span>
                            <span>{repo.category || 'Other'}</span>
                          </div>
                          <span className="font-mono bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">
                            {repo.latest_version || 'v1.0'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-[#30363d] border-dashed rounded-xl p-12 text-center bg-[#0d1117]">
                    <div className="w-12 h-12 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mx-auto mb-3 text-[#8b949e]">
                      <Book className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold mb-1 text-[#f0f6fc]">No public prompts yet</h3>
                    <p className="text-xs text-[#8b949e] max-w-sm mx-auto mb-4">
                      @{profileUser.username} hasn&apos;t published any prompt repositories yet.
                    </p>
                    {isOwnProfile && (
                      <Link 
                        href="/new"
                        className="inline-flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1.5 rounded-md text-xs font-semibold transition"
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
                  <div className="border border-[#30363d] rounded-xl bg-[#0d1117] divide-y divide-[#21262d] overflow-hidden">
                    {recentActivities.map((act, index) => (
                      <div key={index} className="p-4 flex items-center justify-between gap-4 hover:bg-[#161b22]/40 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#58a6ff]">
                            {act.type === "repo_created" ? <Book className="w-4 h-4" /> : <GitMerge className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#f0f6fc]">
                              {act.description}
                            </div>
                            <div className="text-[11px] text-[#8b949e]">
                              in <Link href={`/repo/${act.repo_id}`} className="text-[#58a6ff] hover:underline font-mono">{act.repo_name}</Link>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#484f58] whitespace-nowrap">
                          {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-[#8b949e]">
                    No recent activity recorded.
                  </div>
                )}
              </div>
            )}

            {/* Contribution Activity Heatmap */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                  Contribution Heatmap
                </h2>
                <span className="text-xs text-[#8b949e]">
                  {totalContributions} contributions in the last year
                </span>
              </div>

              <div className="border border-[#30363d] rounded-xl p-4 bg-[#0d1117]">
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

                <div className="flex gap-[3px] overflow-x-auto no-scrollbar pb-2">
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
                    Array.from({ length: 52 }).map((_, col) => (
                      <div key={col} className="flex flex-col gap-[3px]">
                        {Array.from({ length: 7 }).map((_, row) => (
                          <div key={row} className="w-[10px] h-[10px] rounded-sm bg-[#161b22] outline outline-1 outline-offset-[-1px] outline-white/5" />
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
