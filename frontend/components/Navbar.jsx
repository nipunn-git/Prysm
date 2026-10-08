'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, 
  Search, 
  Plus, 
  ChevronDown, 
  CircleDot, 
  GitPullRequest, 
  Inbox, 
  Sparkles, 
  X, 
  BookMarked, 
  Compass, 
  User as UserIcon, 
  LogOut,
  FolderGit2,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true);
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          const res = await fetch(`${API_URL}/api/auth/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const profileRef = useRef(null);
  const createRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (createRef.current && !createRef.current.contains(event.target)) {
        setIsCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname === '/login' || pathname === '/join' || pathname === '/') {
    return null; // Don't show navbar on auth/landing pages
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className="bg-[#010409] border-b border-[#21262d] text-[#c9d1d9] h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Left Side: Hamburger + Octocat + Dashboard title */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d] hover:border-[#8b949e] hover:bg-[#161b22] rounded-md transition"
          >
            <Menu className="w-4 h-4" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition">
            {/* GitHub Octocat Logo SVG */}
            <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" className="fill-white shrink-0">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
            <span className="font-semibold text-sm text-[#f0f6fc] tracking-tight">Dashboard</span>
          </Link>
        </div>

        {/* Right Side: Search bar, Copilot icon, +, Issues, Pull Requests, Inbox, Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* GitHub style search input */}
          <div className="relative hidden md:flex items-center w-60 lg:w-72">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#8b949e]" />
            <input 
              type="text" 
              placeholder="Type / to search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-8 pr-7 py-1 text-xs focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-colors placeholder:text-[#8b949e] text-[#c9d1d9]"
            />
            {searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-md shadow-xl py-1.5 z-50 overflow-hidden">
                {isSearching ? (
                  <div className="px-3 py-2 text-xs text-[#8b949e]">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(u => (
                    <Link
                      key={u.id}
                      href={`/u/${u.username}`}
                      onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[#1f6feb] hover:text-white transition group"
                    >
                      <img 
                        src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                        alt={u.username}
                        className="w-6 h-6 rounded-full border border-[#30363d] object-cover group-hover:border-white/20"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#c9d1d9] group-hover:text-white">{u.name}</span>
                        <span className="text-[10px] text-[#8b949e] group-hover:text-white/80">@{u.username} • ID: {u.id}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-[#8b949e]">No users found for "{searchQuery}"</div>
                )}
                <div className="border-t border-[#30363d] my-1"></div>
                <Link
                  href={`/explore?search=${encodeURIComponent(searchQuery.trim())}`}
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="block px-3 py-2 text-xs text-[#58a6ff] hover:bg-[#1f6feb] hover:text-white transition"
                >
                  See all results
                </Link>
              </div>
            )}
            <div className="absolute right-2 top-1.5 flex items-center">
              <span className="border border-[#30363d] rounded px-1 text-[10px] text-[#8b949e] font-mono leading-tight">/</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Copilot button */}
            <button 
              title="GitHub Copilot"
              onClick={() => router.push('/dashboard')}
              className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition flex items-center justify-center"
            >
              <Sparkles className="w-4 h-4 text-[#8b949e] hover:text-[#f0f6fc]" />
            </button>

            {/* Create (+) dropdown */}
            <div className="relative" ref={createRef}>
              <button 
                onClick={() => setIsCreateOpen(!isCreateOpen)}
                className="flex items-center gap-0.5 p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition"
                title="Create new..."
              >
                <Plus className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 text-[#8b949e]" />
              </button>

              {isCreateOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#161b22] border border-[#30363d] rounded-md shadow-xl py-1.5 z-50 text-xs text-[#c9d1d9]">
                  <Link 
                    href="/new" 
                    onClick={() => setIsCreateOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[#1f6feb] hover:text-white transition"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    <span>New repository</span>
                  </Link>
                  <Link 
                    href="/new" 
                    onClick={() => setIsCreateOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[#1f6feb] hover:text-white transition"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>New prompt repository</span>
                  </Link>
                  <div className="border-t border-[#30363d] my-1"></div>
                  <Link 
                    href="/explore" 
                    onClick={() => setIsCreateOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[#1f6feb] hover:text-white transition"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Explore community prompts</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Issues icon */}
            <Link 
              href="/dashboard"
              title="Issues"
              className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition hidden sm:flex items-center justify-center"
            >
              <CircleDot className="w-4 h-4" />
            </Link>

            {/* Pull Requests icon */}
            <Link 
              href="/dashboard"
              title="Pull requests"
              className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition hidden sm:flex items-center justify-center"
            >
              <GitPullRequest className="w-4 h-4" />
            </Link>

            {/* Notifications Inbox icon */}
            <button 
              title="Notifications"
              className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition relative flex items-center justify-center"
            >
              <Inbox className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#1f6feb] rounded-full ring-2 ring-[#010409]"></span>
            </button>

            {/* Profile Avatar */}
            <div className="relative ml-1" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)} 
                className="flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
                aria-label="User navigation"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#30363d] bg-[#21262d] flex items-center justify-center text-xs font-semibold text-white">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                </div>
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#161b22] border border-[#30363d] rounded-md shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#30363d] text-[#8b949e]">
                    Signed in as <br />
                    <span className="font-semibold text-sm text-[#f0f6fc]">{user?.username || 'user'}</span>
                  </div>
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-2 px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Your profile</span>
                  </Link>
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-2 px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Your repositories</span>
                  </Link>
                  <Link 
                    href="/explore" 
                    className="flex items-center gap-2 px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb] hover:text-white transition"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Explore</span>
                  </Link>
                  <div className="border-t border-[#30363d] my-1"></div>
                  <button 
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                      router.push('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[#da3633] hover:bg-[#da3633] hover:text-white transition text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Drawer Menu */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          <div className="relative w-80 max-w-full bg-[#161b22] border-r border-[#30363d] h-full p-4 flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4">
              <div className="flex items-center gap-2">
                <svg height="28" viewBox="0 0 16 16" width="28" className="fill-white">
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                </svg>
                <span className="font-semibold text-white">PromptHub</span>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="text-[#8b949e] hover:text-white p-1 rounded-md hover:bg-[#21262d]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1 text-sm font-medium text-[#c9d1d9] flex-1">
              <Link 
                href="/dashboard" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition"
              >
                <FolderGit2 className="w-4 h-4 text-[#8b949e]" />
                Home / Dashboard
              </Link>
              <Link 
                href="/explore" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition"
              >
                <Compass className="w-4 h-4 text-[#8b949e]" />
                Explore
              </Link>
              <Link 
                href="/new" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition"
              >
                <Plus className="w-4 h-4 text-[#8b949e]" />
                New repository
              </Link>
              <Link 
                href="/profile" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#21262d] hover:text-white transition"
              >
                <UserIcon className="w-4 h-4 text-[#8b949e]" />
                Profile
              </Link>
            </nav>

            <div className="pt-4 border-t border-[#30363d] text-xs text-[#8b949e]">
              <p>© 2026 PromptHub, Inc.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
