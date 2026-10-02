'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Book, Star, GitMerge, Users, MapPin, Link as LinkIcon, Twitter, Building, Lock, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterUserRepos } from '../../lib/repoStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    company: '',
    location: '',
    website: '',
    twitter: ''
  });
  const [repos, setRepos] = useState([]);
  const [contributions, setContributions] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setFormData({
      name: user.name || '',
      bio: user.bio || '',
      company: user.company || '',
      location: user.location || '',
      website: user.website || '',
      twitter: user.twitter || ''
    });
    fetchRepos();
    fetchContributions();
  }, [user, router, isLoading]);

  const fetchRepos = async () => {
    try {
      const query = user?.id ? `?user_id=${user.id}` : '';
      const res = await fetch(`${API_URL}/api/repositories${query}`);
      if (res.ok) {
        const data = await res.json();
        setRepos(filterUserRepos(data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContributions = async () => {
    try {
      const userId = user?.id || user?.username || 'default';
      const res = await fetch(`${API_URL}/api/auth/users/${userId}/contributions`);
      if (res.ok) {
        const data = await res.json();
        setContributions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !user) return null;

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      bio: user.bio || '',
      company: user.company || '',
      location: user.location || '',
      website: user.website || '',
      twitter: user.twitter || ''
    });
    setIsEditing(false);
  };

  const totalContributions = contributions?.total_contributions || 0;
  const weeks = contributions?.weeks || [];

  // Month labels for the heatmap
  const monthLabels = [];
  if (weeks.length > 0) {
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      if (week.length > 0) {
        const d = new Date(week[0].date);
        const month = d.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({ idx, label: d.toLocaleString('default', { month: 'short' }) });
          lastMonth = month;
        }
      }
    });
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <div className="w-full md:w-[296px] shrink-0">
        <div className="relative mb-4">
          <div className="w-full aspect-square rounded-full border border-[#30363d] bg-[#21262d] overflow-hidden flex items-center justify-center">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt="Profile Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-6xl font-bold text-[#8b949e]">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="absolute bottom-6 right-0 bg-[#161b22] border border-[#30363d] rounded-full p-2 cursor-pointer shadow-sm hover:text-[#58a6ff] transition">
            <span className="text-xl">🎯</span>
          </div>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-3 mb-6">
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
              <span className="font-semibold text-[#c9d1d9] hover:text-[#58a6ff] cursor-pointer">0</span> followers
              <span className="mx-1">·</span>
              <span className="font-semibold text-[#c9d1d9] hover:text-[#58a6ff] cursor-pointer">0</span> following
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
              <span className="bg-[#161b22] border border-[#30363d] text-xs font-semibold px-2 py-0.5 rounded-full">0</span>
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
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
                <div className="flex gap-1 mb-1 pl-8 overflow-x-auto no-scrollbar">
                  {monthLabels.map(({ idx, label }, i) => (
                    <div 
                      key={i} 
                      className="text-[10px] text-[#8b949e]"
                      style={{ 
                        position: 'relative',
                        left: `${idx * 13}px`,
                        marginRight: i < monthLabels.length - 1 
                          ? `${(monthLabels[i + 1]?.idx - idx) * 13 - 30}px` 
                          : 0
                      }}
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
                          {activity.description}
                          {activity.repo_name && (
                            <Link href={`/repo/${activity.repo_id}`} className="text-[#58a6ff] hover:underline ml-1 font-medium">
                              {activity.repo_name}
                            </Link>
                          )}
                        </p>
                        <p className="text-[11px] text-[#8b949e] mt-0.5">
                          {new Date(activity.date).toLocaleString()}
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
                      <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-xs font-semibold text-[#c9d1d9] px-3 py-1 rounded-md flex items-center gap-1.5 transition">
                    <Star className="w-3.5 h-3.5 text-[#8b949e]" />
                    Star
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
    </div>
  );
}
