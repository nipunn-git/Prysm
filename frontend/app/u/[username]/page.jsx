"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Book, Star, Users, MapPin, Link as LinkIcon, Twitter, Building, GitMerge, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import { API_URL } from "../../../lib/api";

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

  const [profileUser, setProfileUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [contributions, setContributions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPublicProfile() {
      try {
        // 1. Fetch user profile
        const userRes = await fetch(`${API_URL}/api/auth/users/${username}`);
        if (!userRes.ok) {
          throw new Error("User not found");
        }
        const userData = await userRes.json();
        setProfileUser(userData);

        // 2. Fetch user's public repositories
        const repoRes = await fetch(`${API_URL}/api/repositories/user/${username}`);
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          setRepos(repoData);
        }

        // 3. Fetch user's contributions (reusing existing endpoint)
        const contribRes = await fetch(`${API_URL}/api/auth/users/${username}/contributions`);
        if (contribRes.ok) {
          const contribData = await contribRes.json();
          setContributions(contribData);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPublicProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8b949e]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold text-[#f0f6fc] mb-4">User not found</h1>
        <p className="text-[#8b949e] mb-6">The user @{username} does not exist or has been removed.</p>
        <button onClick={() => router.back()} className="text-[#58a6ff] hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const specialRepo = repos.find(r => r.name.toLowerCase() === profileUser.username.toLowerCase());
  const publicRepos = repos.filter(r => r.name.toLowerCase() !== profileUser.username.toLowerCase());

  const totalContributions = contributions?.total_contributions || 0;
  const weeks = contributions?.weeks || [];
  
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
          <div className="w-full aspect-square rounded-full border border-[#30363d] bg-[#21262d] overflow-hidden flex items-center justify-center relative">
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
          <div className="absolute bottom-6 right-0 bg-[#161b22] border border-[#30363d] rounded-full p-2 shadow-sm z-10">
            <span className="text-xl">{profileUser.status_emoji || '🎯'}</span>
          </div>
        </div>

        <h1 className="mb-4">
          <span className="block text-2xl font-bold text-[#f0f6fc]">{profileUser.name}</span>
          <span className="block text-xl font-light text-[#8b949e]">@{profileUser.username}</span>
          <span className="block text-xs text-[#484f58] mt-1">ID: {profileUser.id}</span>
        </h1>

        {profileUser.bio && <p className="text-sm text-[#c9d1d9] mb-4">{profileUser.bio}</p>}

        <div className="flex items-center gap-1 text-sm mb-4 text-[#8b949e]">
          <Users className="w-4 h-4" />
          <span className="font-semibold text-[#c9d1d9] hover:text-[#58a6ff] cursor-pointer">0</span> followers
          <span className="mx-1">·</span>
          <span className="font-semibold text-[#c9d1d9] hover:text-[#58a6ff] cursor-pointer">0</span> following
        </div>

        <ul className="text-sm space-y-2 text-[#c9d1d9]">
          {profileUser.company && (
            <li className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#8b949e]" />
              <span className="font-semibold">{profileUser.company}</span>
            </li>
          )}
          {profileUser.location && (
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#8b949e]" />
              <span>{profileUser.location}</span>
            </li>
          )}
          {profileUser.website && (
            <li className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#8b949e]" />
              <a href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] hover:underline">
                {profileUser.website}
              </a>
            </li>
          )}
          {profileUser.twitter && (
            <li className="flex items-center gap-2">
              <Twitter className="w-4 h-4 text-[#8b949e]" />
              <a href={`https://twitter.com/${profileUser.twitter}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] hover:underline">
                @{profileUser.twitter}
              </a>
            </li>
          )}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Special Profile README */}
        {specialRepo && (
          <div className="mb-8 border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
            <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] text-xs font-medium text-[#c9d1d9] flex items-center gap-2">
              <span className="text-[10px] bg-[#21262d] px-1.5 py-0.5 rounded border border-[#30363d] font-semibold">{profileUser.username}</span>
              / README.md
            </div>
            <div className="p-6 text-sm text-[#c9d1d9] prose prose-invert prose-sm max-w-none prose-a:text-[#58a6ff] prose-a:no-underline hover:prose-a:underline prose-headings:border-b prose-headings:border-[#30363d] prose-headings:pb-2 prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-[#30363d]">
              {specialRepo.latest_prompt ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {specialRepo.latest_prompt}
                </ReactMarkdown>
              ) : (
                <p>Hello! This is my profile.</p>
              )}
            </div>
          </div>
        )}

        {/* Public Repos */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#f0f6fc] font-medium">Public repositories</span>
          </div>
          
          {publicRepos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {publicRepos.map((repo) => (
                <Link 
                  key={repo.id}
                  href={`/repo/${repo.id}`}
                  className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117] hover:border-[#8b949e]/50 transition group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Book className="w-4 h-4 text-[#8b949e]" />
                    <span className="text-sm font-semibold text-[#58a6ff] group-hover:underline">{repo.name}</span>
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
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-[#30363d] border-dashed rounded-md p-8 text-center bg-[#161b22]">
              <h3 className="text-sm font-medium mb-2 text-[#f0f6fc]">No public repositories yet.</h3>
              <p className="text-xs text-[#8b949e]">@{profileUser.username} hasn't created any public prompts.</p>
            </div>
          )}
        </div>

        {/* Contribution Graph */}
        <div>
          <h2 className="text-sm text-[#f0f6fc] mb-2">{totalContributions} contributions in the last year</h2>
          <div className="border border-[#30363d] rounded-md p-4 bg-[#0d1117]">
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
  );
}
