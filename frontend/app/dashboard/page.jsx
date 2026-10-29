"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Book, 
  Star, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Sparkles, 
  Send, 
  Zap, 
  Bot, 
  FlaskConical, 
  FileCode2, 
  GitBranch, 
  GitCompare,
  FileText,
  ExternalLink,
  Loader2,
  Lock,
  Globe,
  Copy,
  CheckCircle,
  Save,
  Plus,
  Compass,
  GitFork,
  ArrowRight,
  User as UserIcon,
  X,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  ChevronUp,
  Eye,
  ArrowUp,
  Mic,
  Lightbulb,
  Code,
  Cog,
  History,
  BookmarkPlus,
  Search
} from "lucide-react";
import { GridPulse } from "@/components/ui/grid-pulse";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { 
  filterUserRepos, 
  addCreatedRepoId, 
  saveForkInfo, 
  generateRepoName 
} from "../../lib/repoStore";

import { API_URL } from "../../lib/api";
import { getCachedData, setCachedData } from "../../lib/cache";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isDark } = useTheme();
  
  // Repositories state - clean SSR baseline to prevent hydration mismatch
  const [repos, setRepos] = useState([]);
  const [communityRepos, setCommunityRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repoSearch, setRepoSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Futuristic Prysm AI Controls
  const [selectedMode, setSelectedMode] = useState("Auto");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // AI Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatError, setChatError] = useState(null);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Voice speech-to-text handler
  const handleVoiceInput = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice input is not supported by your current browser.");
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setChatInput(prev => (prev ? prev + ' ' : '') + transcript);
        }
        setIsListening(false);
        chatInputRef.current?.focus();
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  }, []);

  // Save as Repo Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTargetPrompt, setSaveTargetPrompt] = useState("");
  const [saveRepoName, setSaveRepoName] = useState("");
  const [saveRepoDesc, setSaveRepoDesc] = useState("");
  const [saveCategory, setSaveCategory] = useState("Productivity");
  const [saveVisibility, setSaveVisibility] = useState("Public"); // Public by default
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);

  // Fork Modal State (for community prompts)
  const [forkModalRepo, setForkModalRepo] = useState(null);
  const [forkRepoName, setForkRepoName] = useState("");
  const [forkVisibility, setForkVisibility] = useState("Public");
  const [isForking, setIsForking] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState(null);

  // Fetch repositories from API - uses owner_id from DB so repos survive logout/login
  const fetchRepos = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const targetUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      if (!targetUserId) {
        setLoading(false);
        return;
      }
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      
      // Parallel fetch for lightning speed
      const [res, expRes] = await Promise.all([
        fetch(`${API_URL}/api/repositories?user_id=${encodeURIComponent(targetUserId)}`, { headers }),
        fetch(`${API_URL}/api/repositories/explore?user_id=${encodeURIComponent(targetUserId)}`, { headers })
      ]);

      if (res.ok) {
        const data = await res.json();
        setRepos(data);
        setCachedData(`dashboard_repos_${targetUserId}`, data);
      }

      if (expRes.ok) {
        const expData = await expRes.json();
        const list = Array.isArray(expData) ? expData : [];
        setCommunityRepos(list);
        setCachedData('dashboard_community_repos', list);
      }
    } catch (e) {
      console.error("Failed to fetch repositories:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ChatGPT-style Chat Sessions state (Saved, Renamable, Deletable, Collapsible)
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isHistoryHidden, setIsHistoryHidden] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  const getStorageKey = useCallback(() => {
    const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);
    return effectiveUserId ? `prompthub_chat_sessions_${effectiveUserId}` : 'prompthub_chat_sessions_guest';
  }, [user?.id]);

  // Load chat sessions on mount or when user changes - ALWAYS start on fresh New Chat
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = getStorageKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatSessions(parsed);
          // Always start in fresh New Chat on app launch
          setActiveSessionId(null);
          setChatMessages([]);
        }
      }
      const hiddenPref = localStorage.getItem('prompthub_chat_history_hidden');
      if (hiddenPref !== null) {
        setIsHistoryHidden(hiddenPref === 'true');
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  }, [getStorageKey]);

  // Helper to persist sessions
  const persistSessions = useCallback((updatedList) => {
    setChatSessions(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(updatedList));
      } catch (e) {
        console.error("Failed to save chat sessions:", e);
      }
    }
  }, [getStorageKey]);

  // Start a new chat
  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setChatMessages([]);
    setChatInput("");
    setChatError(null);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, []);

  // Select an existing chat
  const handleSelectSession = useCallback((sessionId) => {
    const found = chatSessions.find(s => s.id === sessionId);
    if (found) {
      setActiveSessionId(found.id);
      setChatMessages(found.messages || []);
      setChatError(null);
    }
  }, [chatSessions]);

  // Delete a chat session
  const handleDeleteSession = useCallback((e, sessionId) => {
    e.stopPropagation();
    const updated = chatSessions.filter(s => s.id !== sessionId);
    persistSessions(updated);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setChatMessages(updated[0].messages || []);
      } else {
        setActiveSessionId(null);
        setChatMessages([]);
      }
    }
  }, [chatSessions, activeSessionId, persistSessions]);

  // Rename a chat session
  const handleStartRename = useCallback((e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  }, []);

  const handleSaveRename = useCallback((e, sessionId) => {
    if (e) e.stopPropagation();
    const cleanTitle = editTitleInput.trim();
    if (cleanTitle) {
      const updated = chatSessions.map(s => s.id === sessionId ? { ...s, title: cleanTitle } : s);
      persistSessions(updated);
    }
    setEditingSessionId(null);
    setEditTitleInput("");
  }, [editTitleInput, chatSessions, persistSessions]);

  const handleCancelRename = useCallback((e) => {
    if (e) e.stopPropagation();
    setEditingSessionId(null);
    setEditTitleInput("");
  }, []);

  // Toggle hide chat history
  const toggleHistoryHidden = useCallback(() => {
    setIsHistoryHidden(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('prompthub_chat_history_hidden', String(next));
      }
      return next;
    });
  }, []);

  // Send a chat message to AI (AI answers in chat WITHOUT auto-creating repo)
  const sendMessage = useCallback(async (overrideText) => {
    const rawDomValue = chatInputRef.current ? chatInputRef.current.value : "";
    const msgText = (typeof overrideText === "string" && overrideText.trim().length > 0)
      ? overrideText.trim()
      : (chatInput.trim() || rawDomValue.trim());

    if (!msgText || isAiThinking) return;

    if (chatInputRef.current) chatInputRef.current.value = "";
    setChatInput("");
    setChatError(null);

    const userMsg = { role: "user", content: msgText };
    const placeholderAssistantMsg = {
      role: "assistant",
      content: "",
      isStreaming: true,
      userQuery: msgText,
      suggested_actions: ["save_as_repo", "copy_prompt"]
    };

    const newMessages = [...chatMessages, userMsg, placeholderAssistantMsg];
    setChatMessages(newMessages);
    setIsAiThinking(true);

    // Track or create session
    let currentId = activeSessionId;
    let nextSessions = [...chatSessions];
    if (!currentId) {
      currentId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setActiveSessionId(currentId);
      const generatedTitle = msgText.replace(/[\r\n]+/g, ' ').trim().slice(0, 36) || "New Chat";
      const createdSession = {
        id: currentId,
        title: generatedTitle,
        messages: [userMsg],
        updatedAt: Date.now()
      };
      nextSessions = [createdSession, ...nextSessions];
      persistSessions(nextSessions);
    } else {
      const idx = nextSessions.findIndex(s => s.id === currentId);
      if (idx !== -1) {
        const item = { ...nextSessions[idx], messages: [...chatMessages, userMsg], updatedAt: Date.now() };
        nextSessions.splice(idx, 1);
        nextSessions.unshift(item);
        persistSessions(nextSessions);
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
          user_id: user?.id || null,
          mode: selectedMode,
          create_repo: false, // Do NOT auto-create repo without user action!
          visibility: "Private"
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to get AI response");
      }

      const data = await res.json();
      const fullReply = data.reply || "";

      // Instant response delivery (no artificial typewriter delay)
      const finalAssistantMsg = {
        role: "assistant",
        content: fullReply,
        isStreaming: false,
        userQuery: msgText,
        repo_created: data.repo_created || null,
        suggested_actions: ["save_as_repo", "copy_prompt"]
      };

      const finalMessages = [...chatMessages, userMsg, finalAssistantMsg];
      setChatMessages(finalMessages);

      // Save into sessions
      setChatSessions(prev => {
        const updated = prev.map(s => s.id === currentId ? { ...s, messages: finalMessages, updatedAt: Date.now() } : s);
        if (typeof window !== 'undefined') {
          try {
            const key = getStorageKey();
            localStorage.setItem(key, JSON.stringify(updated));
          } catch (e) {}
        }
        return updated;
      });

    } catch (err) {
      console.error("Chat error:", err);
      setChatError(err.message || "Failed to get AI response");
      const errAssistantMsg = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        isError: true,
        isStreaming: false
      };
      const finalMessages = [...chatMessages, userMsg, errAssistantMsg];
      setChatMessages(finalMessages);

      setChatSessions(prev => {
        const updated = prev.map(s => s.id === currentId ? { ...s, messages: finalMessages, updatedAt: Date.now() } : s);
        if (typeof window !== 'undefined') {
          try {
            const key = getStorageKey();
            localStorage.setItem(key, JSON.stringify(updated));
          } catch (e) {}
        }
        return updated;
      });
    } finally {
      setIsAiThinking(false);
    }
  }, [chatInput, isAiThinking, chatMessages, user?.id, selectedMode, activeSessionId, chatSessions, persistSessions, getStorageKey]);

  // Fetch repositories immediately on mount — load local cache first, then fetch
  useEffect(() => {
    const targetUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);
    if (targetUserId) {
      const cached = getCachedData(`dashboard_repos_${targetUserId}`, []);
      if (cached && cached.length > 0) {
        setRepos(cached);
        setLoading(false);
      }
    }
    const commCached = getCachedData('dashboard_community_repos', []);
    if (commCached && commCached.length > 0) {
      setCommunityRepos(commCached);
    }
    fetchRepos();
  }, [fetchRepos, user?.id]);

  // Auth check: if guest, allow them to freely interact with Prysm and save session locally
  useEffect(() => {
    // Guest sessions are persisted in localStorage under prompthub_chat_sessions_guest
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isAiThinking]);

  // Handle incoming prompt optimization from other repositories
  useEffect(() => {
    const promptToOptimize = sessionStorage.getItem('optimize_prompt');
    if (promptToOptimize) {
      sessionStorage.removeItem('optimize_prompt');
      setTimeout(() => {
        sendMessage(`Please optimize this prompt to be more token efficient while maintaining its functionality:\n\n\`\`\`prompt\n${promptToOptimize}\n\`\`\``);
      }, 500); // slight delay to ensure UI is ready
    }
  }, [sendMessage]);

  // Intelligently extract complete code or prompt block from AI response without accidental inter-block cutting
  const extractCodeOrPrompt = (content) => {
    if (!content || typeof content !== "string") return "";

    // 1. Look for explicit ```prompt block
    const promptMatch = content.match(/```prompt\s*\n([\s\S]*?)```/i);
    if (promptMatch && promptMatch[1].trim()) {
      return promptMatch[1].trim();
    }

    // 2. Extract ALL genuine markdown code blocks (e.g. ```c, ```python, ```javascript, ```)
    const codeBlockRegex = /```(?:[a-zA-Z0-9_#-]*\s*\n)?([\s\S]*?)```/g;
    const blocks = [];
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const code = match[1].trim();
      if (code) {
        blocks.push(code);
      }
    }

    if (blocks.length > 0) {
      // Find the longest code block (which represents the complete runnable code or prompt)
      const longest = blocks.reduce((a, b) => (b.length > a.length ? b : a), "");
      if (longest.length > 15) {
        return longest;
      }
    }

    // 3. Fallback: Entire cleaned response without repo_meta
    return content.replace(/<repo_meta>[\s\S]*?<\/repo_meta>/g, "").trim();
  };

  // Open Save as Repository modal with smart repo name according to the prompt
  const openSaveAsRepoModal = (promptContent, userQuery) => {
    // Extract actual complete prompt or runnable code
    const cleanPrompt = extractCodeOrPrompt(promptContent);

    // Generate intelligent kebab-case repo name according to the prompt
    const smartName = generateRepoName(cleanPrompt, userQuery);
    
    // Infer category
    const qLower = (userQuery + " " + cleanPrompt).toLowerCase();
    let cat = "Productivity";
    if (qLower.includes("code") || qLower.includes("sql") || qLower.includes("python") || qLower.includes(" c ") || qLower.includes("bug") || qLower.includes("#include")) {
      cat = "Coding";
    } else if (qLower.includes("research") || qLower.includes("paper") || qLower.includes("study")) {
      cat = "Research";
    } else if (qLower.includes("tutor") || qLower.includes("teach") || qLower.includes("learn")) {
      cat = "Education";
    } else if (qLower.includes("write") || qLower.includes("resume") || qLower.includes("blog")) {
      cat = "Writing";
    }

    setSaveTargetPrompt(cleanPrompt);
    setSaveRepoName(smartName);
    setSaveRepoDesc(`AI prompt for: ${userQuery || smartName.replace(/-/g, ' ')}`);
    setSaveCategory(cat);
    setSaveVisibility("Public"); // Public by default
    setSaveModalOpen(true);
  };

  // Execute creating the repo from the modal
  const handleExecuteSaveRepo = async () => {
    if (!saveTargetPrompt.trim() || !saveRepoName.trim()) return;
    setIsCreatingRepo(true);
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      
      const queryParams = new URLSearchParams();
      if (effectiveUserId) queryParams.append('user_id', effectiveUserId);
      if (storedToken) queryParams.append('token', storedToken);

      const headers = { "Content-Type": "application/json" };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (effectiveUserId) headers['X-User-Id'] = effectiveUserId;

      const res = await fetch(`${API_URL}/api/repositories?${queryParams.toString()}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: saveRepoName.trim(),
          description: saveRepoDesc.trim() || "AI prompt repository",
          category: saveCategory,
          visibility: saveVisibility, // Default Private
          initial_prompt: saveTargetPrompt
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create repository");
      }

      const createdRepo = await res.json();
      addCreatedRepoId(createdRepo.id);

      // Immediately sync state so new repository appears in the sidebar right away!
      setRepos(prev => [createdRepo, ...prev.filter(r => r.id !== createdRepo.id)]);
      fetchRepos();

      setSaveModalOpen(false);

      // Append success message to chat with direct link
      setChatMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Successfully created repository **${createdRepo.name}** with your prompt!`,
          repo_created: {
            id: createdRepo.id,
            name: createdRepo.name,
            visibility: createdRepo.visibility,
            description: createdRepo.description
          }
        }
      ]);

      await fetchRepos();
    } catch (e) {
      console.error("Save repo error:", e);
      alert(e.message || "Failed to save repository");
    } finally {
      setIsCreatingRepo(false);
    }
  };

  // Fork a community repository
  const handleExecuteFork = async () => {
    if (!forkModalRepo) return;
    setIsForking(true);
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      
      const queryParams = new URLSearchParams();
      if (effectiveUserId) queryParams.append('user_id', effectiveUserId);
      if (storedToken) queryParams.append('token', storedToken);

      const headers = { "Content-Type": "application/json" };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      if (effectiveUserId) headers['X-User-Id'] = effectiveUserId;

      const res = await fetch(`${API_URL}/api/repositories?${queryParams.toString()}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: forkRepoName.trim() || forkModalRepo.name,
          description: `Forked from ${forkModalRepo.owner_name || 'community'}/${forkModalRepo.name}. ${forkModalRepo.description || ''}`,
          category: forkModalRepo.category || "Other",
          visibility: forkVisibility || "Public",
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
      setRepos(prev => [newRepo, ...prev.filter(r => r.id !== newRepo.id)]);
      await fetchRepos();
      router.push(`/repo/${newRepo.id}`);
    } catch (e) {
      console.error("Fork error:", e);
      alert(e.message || "Failed to fork repository");
    } finally {
      setIsForking(false);
    }
  };

  // Copy text to clipboard
  const handleCopy = (text, id) => {
    const toCopy = extractCodeOrPrompt(text);
    navigator.clipboard.writeText(toCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter user repositories based on search
  const filteredRepos = (Array.isArray(repos) ? repos : []).filter(repo => 
    (repo?.name && repo.name.toLowerCase().includes((repoSearch || '').toLowerCase())) ||
    (repo?.description && repo.description.toLowerCase().includes((repoSearch || '').toLowerCase()))
  );

  // 5 Suggestion pills from Image 1
  const suggestionPills = [
    { label: "Explain a concept", icon: Sparkles, query: "Explain a complex AI or machine learning concept simply with intuitive analogies and practical examples." },
    { label: "Write a blog", icon: FileText, query: "Write an engaging, SEO-optimized technical blog post about modern software engineering best practices with code snippets." },
    { label: "Generate ideas", icon: Lightbulb, query: "Generate 10 groundbreaking AI prompt tools and autonomous agent system ideas with high utility." },
    { label: "Debug code", icon: Code, query: "Analyze and debug this code snippet, explaining the root cause and providing an optimized solution." },
    { label: "Brainstorm", icon: Cog, query: "Brainstorm a comprehensive prompt architecture and evaluation suite for our AI assistant system." }
  ];

  // Render ultra-premium markdown chat content with code copy, tables & rich typography
  const renderMessageContent = (content) => {
    if (!content) return null;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && (match || codeString.includes("\n"))) {
              const lang = match ? match[1] : "prompt";
              const codeId = `code-${Math.random().toString(36).substring(2, 8)}`;

              return (
                <div className={`my-3 rounded-2xl border overflow-hidden shadow-lg transition-all ${
                  isDark 
                    ? "bg-[#090d16] border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]" 
                    : "bg-[#0f172a] border-slate-700 shadow-[0_8px_30px_rgba(15,23,42,0.15)] text-slate-100"
                }`}>
                  <div className="bg-white/[0.04] border-b border-white/10 px-3.5 py-2 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <span className="flex gap-1.5 items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      </span>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold ml-1">
                        {lang}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(codeString, codeId)}
                      className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 text-[11px] font-mono cursor-pointer"
                      title="Copy code"
                    >
                      {copiedId === codeId ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-cyan-500/30">
                    <code>{codeString}</code>
                  </pre>
                </div>
              );
            }

            return (
              <code 
                className={`px-1.5 py-0.5 rounded-md font-mono text-[12px] font-semibold border ${
                  isDark
                    ? "bg-white/10 text-cyan-300 border-white/10"
                    : "bg-slate-100 text-cyan-700 border-slate-200"
                }`}
                {...props}
              >
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className={`text-base sm:text-lg font-bold tracking-tight mt-4 mb-2 pb-1.5 border-b ${
              isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200"
            }`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-sm sm:text-base font-bold tracking-tight mt-4 mb-2 flex items-center gap-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              <span className="w-1.5 h-4 rounded-full bg-cyan-500 inline-block shrink-0 shadow-[0_0_8px_#06b6d4]" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-xs sm:text-sm font-bold tracking-tight mt-3 mb-1.5 ${
              isDark ? "text-slate-200" : "text-slate-800"
            }`}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className={`text-xs sm:text-sm leading-relaxed my-2 ${
              isDark ? "text-slate-200" : "text-slate-700"
            }`}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1.5 pl-1 list-none">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1.5 pl-4 list-decimal text-xs sm:text-sm leading-relaxed">{children}</ol>
          ),
          li: ({ children }) => (
            <li className={`text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 ${
              isDark ? "text-slate-200" : "text-slate-700"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-[0_0_6px_#38bdf8]" />
              <div className="flex-1">{children}</div>
            </li>
          ),
          strong: ({ children }) => (
            <strong className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className={`my-3 pl-3.5 py-1 border-l-2 rounded-r-lg italic text-xs leading-relaxed ${
              isDark 
                ? "border-cyan-400/60 bg-cyan-500/5 text-slate-300" 
                : "border-cyan-600 bg-cyan-50 text-slate-700"
            }`}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className={`p-2.5 font-semibold text-xs border-b ${
              isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`p-2.5 text-xs border-b ${
              isDark ? "border-white/5 text-slate-300" : "border-slate-100 text-slate-700"
            }`}>
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-cyan-500 hover:text-cyan-400 underline underline-offset-2 transition"
            >
              {children}
            </a>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // Helper to detect if AI response is a normal conversation or contains savable code / prompt
  const isSavableResponse = (content, userQuery = "") => {
    if (!content || typeof content !== "string") return false;
    const lowerQuery = (userQuery || "").toLowerCase().trim();
    
    // Normal casual greetings or small talk
    const casualList = ["hi", "hello", "hey", "sup", "yo", "thanks", "thank you", "who are you", "what is your name", "how are you", "help"];
    if (casualList.some(w => lowerQuery === w || lowerQuery === w + "!")) {
      return false;
    }

    // Contains markdown code block (prompt, python, ts, js, etc.)
    const hasCodeBlock = /```[a-zA-Z0-9_-]*\s*\n[\s\S]+?```/.test(content);
    // Contains structured prompt markers
    const hasPromptStructure = 
      content.includes("### Role") || 
      content.includes("### Primary Objective") || 
      content.includes("## System Prompt") || 
      content.includes("```prompt") ||
      content.includes("```python") ||
      content.includes("```javascript") ||
      content.includes("```tsx");

    const hasActionKeyword = ["create", "generate", "write", "draft", "code", "prompt", "function", "script", "repo", "template", "build", "optimize"].some(k => lowerQuery.includes(k));

    return hasCodeBlock || hasPromptStructure || (hasActionKeyword && content.length > 80);
  };

  return (

    <div className={`w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3 h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-hidden flex flex-col relative transition-colors duration-300 ${
      isDark ? "bg-[#05070c]" : "bg-[#f8fafc]"
    }`}>
      {/* Background Interactive Canvas GridPulse */}
      <GridPulse cell={28} reach={2.8} ambient={3} className="opacity-35 dark:opacity-20 pointer-events-none" />

      {/* Buttery Smooth Looping Tracing Beam Animation */}
      <style jsx global>{`
        @keyframes prysmBeamSweep {
          0% {
            stroke-dashoffset: 1600;
          }
          100% {
            stroke-dashoffset: -240;
          }
        }
        .prysm-dome-beam {
          stroke-dasharray: 240 1600;
          animation: prysmBeamSweep 3.6s linear infinite;
          will-change: stroke-dashoffset;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.45);
        }
      `}</style>

      <div className="flex gap-3 sm:gap-5 items-stretch relative justify-center flex-1 min-h-0 h-full max-h-full overflow-hidden">

        {/* ========================================================
            LEFT COLUMN: Chat History (Futuristic Glass, Toggleable, Searchable)
           ======================================================== */}
        {isHistoryHidden ? (
          <aside className="shrink-0 hidden md:flex flex-col items-center z-20 pt-1">
            <button
              onClick={toggleHistoryHidden}
              title="Show Chat History"
              className={`p-3 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:scale-105 shadow-xl group cursor-pointer ${
                isDark 
                  ? "bg-[#0d1117]/85 border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400" 
                  : "bg-white/90 border-slate-200 hover:border-cyan-600/40 text-slate-600 hover:text-cyan-600"
              }`}
            >
              <History className="w-5 h-5 transition-transform group-hover:rotate-[-20deg]" />
            </button>
          </aside>
        ) : (
          <aside className="w-[280px] lg:w-[305px] shrink-0 hidden md:flex flex-col h-full max-h-full min-h-0 z-20">
            <div className={`border rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl transition-all flex flex-col h-full max-h-full min-h-0 ${
              isDark 
                ? "bg-[#090d16]/85 border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)]" 
                : "bg-white/85 border-slate-200 shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]"
            }`}>
              {/* Header */}
              <div className={`p-3.5 border-b flex items-center justify-between shrink-0 transition-colors ${
                isDark ? "bg-white/[0.02] border-white/10" : "bg-slate-50/80 border-slate-200"
              }`}>
                <div className="flex items-center gap-2 select-none">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-sm ${
                    isDark ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20" : "bg-cyan-600/10 text-cyan-600 border border-cyan-600/15"
                  }`}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className={`text-xs font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                      Chat History
                    </span>
                    <span className={`ml-1.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${
                      isDark ? "bg-white/10 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                    }`}>
                      {chatSessions.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNewChat}
                    title="New Chat"
                    className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                      isDark 
                        ? "bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20" 
                        : "bg-black/5 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-black/10"
                    }`}
                  >
                    <Plus className="w-3 h-3 text-cyan-400" />
                    <span>New</span>
                  </button>
                  <button
                    onClick={toggleHistoryHidden}
                    title="Collapse history"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-black/5"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Search */}
              <div className="px-3 pt-2.5 pb-1 shrink-0">
                <div className={`relative flex items-center rounded-xl border px-2.5 py-1.5 transition ${
                  isDark ? "bg-white/[0.03] border-white/10 focus-within:border-cyan-500/50" : "bg-slate-100/70 border-slate-200 focus-within:border-cyan-600/50"
                }`}>
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className={`w-full bg-transparent border-0 outline-none text-xs ${
                      isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"
                    }`}
                  />
                  {historySearch && (
                    <button onClick={() => setHistorySearch("")} className="text-slate-400 hover:text-slate-200">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions List */}
              <div className="p-2 flex-1 min-h-0 flex flex-col overflow-hidden">
                {chatSessions.length === 0 ? (
                  <div className="text-center py-12 px-3 my-auto">
                    <Bot className={`w-8 h-8 mx-auto mb-2 opacity-30 ${isDark ? "text-white" : "text-black"}`} />
                    <p className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>No chats yet</p>
                    <p className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Conversations will appear here</p>
                    <button
                      onClick={handleNewChat}
                      className={`mt-4 text-xs font-semibold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 mx-auto cursor-pointer ${
                        isDark 
                          ? "bg-white/5 border-white/10 text-cyan-400 hover:bg-white/10" 
                          : "bg-black/5 border-slate-200 text-cyan-700 hover:bg-black/10"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start new chat</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">
                    {chatSessions
                      .filter(s => (s.title || "Untitled Chat").toLowerCase().includes(historySearch.toLowerCase()))
                      .map((session) => {
                        const isActive = session.id === activeSessionId;
                        const isEditing = editingSessionId === session.id;

                        if (isEditing) {
                          return (
                            <div 
                              key={session.id}
                              className={`p-1.5 rounded-xl flex items-center gap-1.5 border ${
                                isDark ? "bg-[#161b22] border-cyan-500/50" : "bg-slate-100 border-cyan-600/50"
                              }`}
                            >
                              <input
                                type="text"
                                value={editTitleInput}
                                onChange={(e) => setEditTitleInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(e, session.id);
                                  if (e.key === 'Escape') handleCancelRename(e);
                                }}
                                autoFocus
                                className={`w-full border rounded-lg px-2 py-1 text-xs focus:outline-none ${
                                  isDark 
                                    ? "bg-[#0d1117] border-white/20 text-white focus:border-cyan-400" 
                                    : "bg-white border-slate-300 text-slate-900 focus:border-cyan-600"
                                }`}
                              />
                              <button
                                onClick={(e) => handleSaveRename(e, session.id)}
                                title="Save title"
                                className="p-1 text-emerald-400 hover:bg-black/10 rounded-md cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancelRename}
                                title="Cancel"
                                className="p-1 text-rose-400 hover:bg-black/10 rounded-md cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={session.id}
                            onClick={() => handleSelectSession(session.id)}
                            className={`group relative flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs cursor-pointer transition-all duration-200 border ${
                              isActive
                                ? isDark 
                                  ? "bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/40 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] font-medium" 
                                  : "bg-gradient-to-r from-cyan-50 via-blue-50 to-transparent border-cyan-600/30 text-cyan-900 font-medium shadow-sm"
                                : isDark
                                  ? "border-transparent text-slate-300 hover:bg-white/[0.04] hover:border-white/10 hover:text-white"
                                  : "border-transparent text-slate-700 hover:bg-slate-100/80 hover:border-slate-200 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                              {isActive ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-slate-300" />
                              )}
                              <span className="truncate text-xs tracking-tight">
                                {session.title || "Untitled Chat"}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={(e) => handleStartRename(e, session)}
                                title="Rename chat"
                                className={`p-1 rounded-md transition cursor-pointer ${
                                  isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-black/5"
                                }`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                title="Delete chat"
                                className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-md transition cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* ========================================================
            CENTER COLUMN: Futuristic Prysm AI Chatbot (Fixed Ratios, Only Chat Scrolls)
           ======================================================== */}
        <main className={`flex-1 min-w-0 h-full max-h-full min-h-0 flex flex-col mx-auto transition-all duration-300 ${isHistoryHidden ? 'max-w-4xl' : 'max-w-3xl xl:max-w-4xl'}`}>
          
          {/* Main Futuristic Card Container */}
          <div className={`rounded-3xl border transition-all duration-300 shadow-2xl overflow-hidden relative flex flex-col h-full max-h-full min-h-0 ${
            isDark 
              ? "bg-[#080b11]/90 backdrop-blur-2xl border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)]" 
              : "bg-white/95 backdrop-blur-2xl border-[#d0d7de] shadow-[0_20px_50px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(0,0,0,0.02)]"
          }`}>
            {/* Background Celestial Arc with Looping Animated Tracing Beam (Only on Welcome Screen) */}
            {chatMessages.length === 0 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-start justify-center">
                {/* Top ambient radiance */}
                <div className={`absolute -top-12 w-[600px] sm:w-[950px] h-[340px] rounded-[100%] blur-[90px] pointer-events-none transition-opacity ${
                  isDark 
                    ? "bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.22)_0%,rgba(14,165,233,0.08)_40%,transparent_75%)] opacity-100" 
                    : "bg-[radial-gradient(ellipse_at_top,rgba(9,105,218,0.12)_0%,rgba(56,189,248,0.05)_50%,transparent_70%)] opacity-80"
                }`} />
                
                {/* Planetary Orbital Horizon Arc with Looping Glowing Beam */}
                <svg 
                  className="w-[780px] sm:w-[1150px] h-[360px] sm:h-[460px] overflow-visible -top-8 sm:-top-12 relative pointer-events-none select-none" 
                  viewBox="0 0 1000 400"
                >
                  <defs>
                    <linearGradient id="domeBaseGrad" x1="0%" y1="100%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={isDark ? "rgba(255,255,255,0)" : "rgba(9,105,218,0)"} />
                      <stop offset="25%" stopColor={isDark ? "rgba(255,255,255,0.16)" : "rgba(9,105,218,0.15)"} />
                      <stop offset="50%" stopColor={isDark ? "rgba(255,255,255,0.38)" : "rgba(9,105,218,0.32)"} />
                      <stop offset="75%" stopColor={isDark ? "rgba(255,255,255,0.16)" : "rgba(9,105,218,0.15)"} />
                      <stop offset="100%" stopColor={isDark ? "rgba(255,255,255,0)" : "rgba(9,105,218,0)"} />
                    </linearGradient>

                    <linearGradient id="domeBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                      <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.5" />
                      <stop offset="75%" stopColor="#67e8f9" stopOpacity="0.95" />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                    </linearGradient>

                    <filter id="domeGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Base subtle dome arc */}
                  <path
                    d="M 60,370 A 500,320 0 0,1 940,370"
                    fill="none"
                    stroke="url(#domeBaseGrad)"
                    strokeWidth="1.5"
                  />

                  {/* Looping glowing comet beam tracing along the arc - single smooth continuous flow */}
                  <path
                    d="M 60,370 A 500,320 0 0,1 940,370"
                    fill="none"
                    stroke="url(#domeBeamGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    filter="url(#domeGlowFilter)"
                    className="prysm-dome-beam"
                  />
                </svg>

                {/* Lower subtle perspective glow line */}
                <div className={`absolute bottom-12 w-full max-w-2xl h-px pointer-events-none ${
                  isDark 
                    ? "bg-gradient-to-r from-transparent via-white/15 to-transparent" 
                    : "bg-gradient-to-r from-transparent via-black/10 to-transparent"
                }`} />
              </div>
            )}

            {/* Inner Content Area - strictly bounded flex-1 */}
            <div className="relative z-10 flex flex-col h-full max-h-full min-h-0 flex-1 overflow-hidden">

              {/* Active Chat Header (Visible when chat messages exist) */}
              {chatMessages.length > 0 && (
                <div className={`px-5 py-2.5 border-b flex items-center justify-between backdrop-blur-md shrink-0 transition-colors ${
                  isDark ? "bg-[#0d1117]/60 border-white/10" : "bg-white/70 border-[#d0d7de]"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <img 
                      src="/prysm.png" 
                      alt="Prysm" 
                      className="w-5 h-5 object-contain drop-shadow" 
                    />
                    <span className={`font-bold text-sm tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Prysm</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                      isDark ? "bg-white/5 border-white/10 text-cyan-300" : "bg-black/5 border-black/10 text-cyan-800"
                    }`}>
                      {selectedMode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleNewChat}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 font-medium cursor-pointer ${
                        isDark 
                          ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" 
                          : "bg-black/5 border-[#d0d7de] text-slate-700 hover:bg-black/10"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Chat</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Messages or Welcome Hero - Fixed on Hero, scrollable only during chat */}
              <div className={`flex-1 min-h-0 p-4 sm:p-6 ${
                chatMessages.length === 0
                  ? "overflow-hidden flex flex-col justify-center"
                  : "overflow-y-auto custom-scrollbar space-y-4"
              }`}>
                {chatMessages.length === 0 ? (
                  /* ========================================================
                      WELCOME HERO VIEW (Exact Futuristic Design from Image 1)
                     ======================================================== */
                  <div className="flex flex-col items-center justify-center text-center px-4 py-2 relative my-auto">
                    
                    {/* Metallic/Crystal Prysm Emblem */}
                    <div className="relative flex items-center justify-center mb-2">
                      <img 
                        src="/prysm.png" 
                        alt="Prysm" 
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain relative z-10 select-none hover:scale-105 transition-transform duration-300 drop-shadow-[0_4px_24px_rgba(56,189,248,0.25)]" 
                      />
                    </div>

                    {/* Brand Wordmark Title */}
                    <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 ${
                      isDark 
                        ? "bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(255,255,255,0.15)]" 
                        : "text-slate-900"
                    }`}>
                      Prysm
                    </h1>

                    {/* Futuristic Floating Input Capsule */}
                    <div
                      className={`w-full max-w-2xl sm:max-w-3xl rounded-3xl p-3 sm:p-4 transition-all duration-300 relative z-20 text-left ${
                        isDark 
                          ? "bg-[#0d1117]/85 backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.6),0_0_25px_rgba(255,255,255,0.05)] focus-within:border-white/30 focus-within:shadow-[0_16px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(88,166,255,0.2)]"
                          : "bg-white/90 backdrop-blur-2xl border border-[#d0d7de] shadow-[0_16px_40px_rgba(0,0,0,0.08),0_0_20px_rgba(9,105,218,0.06)] focus-within:border-[#0969da]/50 focus-within:shadow-[0_16px_50px_rgba(9,105,218,0.12)]"
                      }`}
                    >
                      {/* Textarea for "Ask anything..." */}
                      <textarea
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onInput={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Ask anything..."
                        rows={2}
                        className={`w-full bg-transparent border-0 outline-none resize-none px-3 pt-1 text-sm sm:text-base leading-relaxed ${
                          isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"
                        }`}
                        style={{ minHeight: "44px", maxHeight: "120px" }}
                        disabled={isAiThinking}
                      />

                      {/* Lower capsule controls bar */}
                      <div className="flex items-center justify-between pt-2 px-1">
                        {/* Left action icons: (+) and (🌐 Auto ⌵) */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            title="Add context"
                            onClick={() => {
                              setChatInput(prev => prev ? prev + "\n[Context: Add requirements]" : "Context: ");
                              chatInputRef.current?.focus();
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                              isDark 
                                ? "text-slate-400 hover:text-white hover:bg-white/10" 
                                : "text-slate-500 hover:text-slate-950 hover:bg-black/5"
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          {/* Model / Auto selector dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowModelDropdown(!showModelDropdown)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                                isDark 
                                  ? "bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:border-white/20" 
                                  : "bg-black/[0.03] border-[#d0d7de] text-slate-700 hover:bg-black/[0.06]"
                              }`}
                            >
                              <Globe className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{selectedMode}</span>
                              <ChevronDown className="w-3 h-3 opacity-60" />
                            </button>

                            {showModelDropdown && (
                              <div className={`absolute left-0 bottom-full mb-2 w-48 rounded-xl border p-1 shadow-2xl z-50 text-xs backdrop-blur-xl ${
                                isDark ? "bg-[#161b22]/95 border-white/15 text-slate-200" : "bg-white/95 border-[#d0d7de] text-slate-800"
                              }`}>
                                {["Auto", "Prompt Architect", "Code Specialist", "Fast Creative"].map((mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                      setSelectedMode(mode);
                                      setShowModelDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                                      selectedMode === mode 
                                        ? (isDark ? "bg-cyan-600 text-white" : "bg-cyan-600 text-white") 
                                        : (isDark ? "hover:bg-white/10" : "hover:bg-black/5")
                                    }`}
                                  >
                                    <span>{mode}</span>
                                    {selectedMode === mode && <Check className="w-3.5 h-3.5" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right action icons: Voice mic and Glowing Circular Arrow Submit */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            title="Voice input"
                            onClick={handleVoiceInput}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                              isListening 
                                ? "text-red-500 animate-pulse bg-red-500/20" 
                                : isDark 
                                  ? "text-slate-400 hover:text-white hover:bg-white/10" 
                                  : "text-slate-500 hover:text-slate-900 hover:bg-black/5"
                            }`}
                          >
                            <Mic className="w-4 h-4" />
                          </button>

                          {/* Glowing circular up-arrow submit button */}
                          <button
                            type="button"
                            onClick={() => sendMessage()}
                            disabled={isAiThinking}
                            title="Send"
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                              chatInput.trim()
                                ? isDark
                                  ? "bg-white text-black hover:bg-slate-200 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.6)] cursor-pointer"
                                  : "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                                : isDark
                                  ? "bg-white/20 text-white/50 hover:bg-white/30 cursor-pointer"
                                  : "bg-black/15 text-black/40 hover:bg-black/25 cursor-pointer"
                            }`}
                          >
                            {isAiThinking ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Suggestion Pills underneath (Exact 5 from Image 1) */}
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mt-5 max-w-3xl">
                      {suggestionPills.map((action, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => sendMessage(action.query)}
                          className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-2 group backdrop-blur-md cursor-pointer ${
                            isDark
                              ? "bg-white/[0.03] border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white hover:bg-white/[0.08] shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                              : "bg-black/[0.02] border-[#d0d7de] hover:border-cyan-600/40 text-slate-700 hover:text-slate-900 hover:bg-black/[0.05] shadow-sm"
                          }`}
                        >
                          <action.icon className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                          <span>{action.label}</span>
                          <span className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
                        </button>
                      ))}
                    </div>

                    {/* Bottom Tagline: —— A BETTER WAY TO THINK —— */}
                    <div className="mt-8 sm:mt-10 flex items-center justify-center gap-4 w-full max-w-md opacity-60">
                      <div className={`h-px flex-1 ${isDark ? "bg-gradient-to-r from-transparent to-white/30" : "bg-gradient-to-r from-transparent to-black/20"}`} />
                      <span className={`text-[10px] tracking-[0.3em] uppercase font-mono font-medium ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}>
                        A BETTER WAY TO THINK
                      </span>
                      <div className={`h-px flex-1 ${isDark ? "bg-gradient-to-l from-transparent to-white/30" : "bg-gradient-to-l from-transparent to-black/20"}`} />
                    </div>

                  </div>
                ) : (
                  /* ========================================================
                      ACTIVE CHAT MESSAGES STREAM (Premium Futuristic UI)
                     ======================================================== */
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="relative flex items-center justify-center shrink-0 mt-1">
                          <div className={`w-8 h-8 rounded-2xl border flex items-center justify-center p-1.5 overflow-hidden shadow-md transition-all ${
                            isDark 
                              ? "bg-[#0f172a] border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20" 
                              : "bg-white border-slate-200 shadow-sm ring-1 ring-slate-100"
                          }`}>
                            <img 
                              src="/prysm.png" 
                              alt="Prysm" 
                              className="w-full h-full object-contain" 
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className={`max-w-[88%] ${msg.role === "user" ? "order-first" : ""}`}>
                        <div className={`rounded-3xl px-5 py-4 transition-all duration-200 shadow-md ${
                          msg.role === "user" 
                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white ml-auto shadow-[0_8px_25px_rgba(6,182,212,0.25)] border border-cyan-400/30" 
                            : msg.isError 
                              ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                              : isDark 
                                ? "bg-[#0d121d]/90 backdrop-blur-xl border border-white/10 text-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]" 
                                : "bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-800 shadow-[0_12px_35px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]"
                        }`}>
                          {msg.role === "user" ? (
                            <p className="text-xs sm:text-sm leading-relaxed">{msg.content}</p>
                          ) : (
                            <div className="prose-sm">
                              {msg.content ? (
                                <>
                                  {renderMessageContent(msg.content)}
                                  {msg.isStreaming && (
                                    <span className="inline-block w-1.5 h-4 ml-1.5 bg-cyan-400 animate-pulse rounded-sm align-middle shadow-[0_0_8px_#22d3ee]" />
                                  )}
                                </>
                              ) : msg.isStreaming ? (
                                <div className="flex items-center gap-2 py-0.5 select-none">
                                  <span className="inline-block w-1.5 h-4 bg-cyan-400 animate-pulse rounded-sm shadow-[0_0_8px_#22d3ee]" />
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Repo Created Success Card (if created) */}
                        {msg.repo_created && (
                          <div className="mt-2.5 border border-emerald-500/40 bg-emerald-950/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg backdrop-blur-xl">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <Book className="w-4 h-4 text-emerald-400" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                                  Private Repository Created
                                  <Lock className="w-3 h-3 text-amber-300" />
                                </div>
                                <div className="text-[11px] text-slate-300 font-mono">{msg.repo_created.name}</div>
                              </div>
                            </div>
                            <Link
                              href={`/repo/${msg.repo_created.id}`}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-md whitespace-nowrap"
                            >
                              <span>View Repository</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        )}

                        {/* Action Buttons for AI responses: Save to Repo, Copy (shown when complete) */}
                        {msg.role === "assistant" && !msg.isStreaming && !msg.isError && !msg.repo_created && (
                          <div className="flex items-center gap-2.5 mt-2.5 pl-1">
                            {/* Copy button */}
                            <button
                              onClick={() => handleCopy(msg.content, `msg-${idx}`)}
                              className={`px-3 py-1.5 rounded-xl border transition-all duration-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-sm ${
                                isDark 
                                  ? "bg-white/5 border-white/10 hover:border-white/20 text-slate-300 hover:text-white hover:bg-white/10" 
                                  : "bg-black/[0.03] border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-black/[0.06]"
                              }`}
                              title="Copy prompt content"
                            >
                              {copiedId === `msg-${idx}` ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 font-semibold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Ultra-Premium Save as Repo Button - Only for code or prompts, NOT on normal conversation */}
                            {isSavableResponse(msg.content, msg.userQuery) && (
                              <button
                                onClick={() => openSaveAsRepoModal(msg.content, msg.userQuery)}
                                className="relative group overflow-hidden px-4 py-1.5 rounded-xl font-medium text-xs transition-all duration-300 flex items-center gap-2 text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-400 border border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                                title="Save as Private Repository"
                              >
                                {/* Shimmer light sweep on hover */}
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                <BookmarkPlus className="w-3.5 h-3.5 text-emerald-100 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold tracking-wide">Save as Repo</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-black/25 px-1.5 py-0.5 rounded-md border border-white/20 text-emerald-100">
                                  <Lock className="w-2.5 h-2.5 text-amber-300" />
                                  <span>Private</span>
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {msg.role === "user" && (
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-1 overflow-hidden shadow-sm ${
                          isDark ? "bg-[#21262d] border-white/10" : "bg-white border-slate-200"
                        }`}>
                          {user?.avatar ? (
                            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar for Active Chat Messages - firmly docked shrink-0 */}
              {chatMessages.length > 0 && (
                <div className={`border-t p-3 sm:p-4 backdrop-blur-xl shrink-0 ${
                  isDark ? "bg-[#0d1117]/80 border-white/10" : "bg-white/80 border-[#d0d7de]"
                }`}>
                  {chatError && (
                    <div className="text-xs text-rose-400 mb-2 px-1 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {chatError}
                    </div>
                  )}
                  {/* Floating Capsule Input in Active Chat */}
                  <div
                    className={`rounded-2xl p-2.5 sm:p-3 border transition-all ${
                      isDark 
                        ? "bg-[#161b22]/90 border-white/15 focus-within:border-cyan-500/50" 
                        : "bg-[#f6f8fa] border-[#d0d7de] focus-within:border-cyan-600/50"
                    }`}
                  >
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Ask Prysm to create, optimize, or explain prompts..."
                      rows={1}
                      className={`w-full bg-transparent border-0 outline-none resize-none px-2 text-sm ${
                        isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"
                      }`}
                      style={{ minHeight: "36px", maxHeight: "110px" }}
                      onInput={(e) => {
                        e.target.style.height = "36px";
                        e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
                      }}
                      disabled={isAiThinking}
                    />

                    <div className="flex items-center justify-between pt-2 px-1 border-t border-dashed border-white/5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-mono font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          Mode: {selectedMode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Voice input"
                          onClick={handleVoiceInput}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                            isListening ? "text-red-500 animate-pulse bg-red-500/20" : isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          type="button"
                          onClick={() => sendMessage()}
                          disabled={isAiThinking}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            chatInput.trim()
                              ? isDark
                                ? "bg-white text-black hover:bg-slate-200 cursor-pointer shadow-md"
                                : "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-md"
                              : isDark
                                ? "bg-white/10 text-white/30 cursor-pointer hover:bg-white/20"
                                : "bg-black/10 text-black/30 cursor-pointer hover:bg-black/20"
                          }`}
                          title="Send message"
                        >
                          {isAiThinking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      {/* ========================================================
          SAVE TO REPO MODAL (Auto repo name from prompt, Private by default)
         ======================================================== */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 shadow-2xl relative">
            <h2 className="text-base font-semibold text-[#f0f6fc] flex items-center gap-2 mb-2">
              <Save className="w-5 h-5 text-[#3fb950]" />
              Save Prompt as Repository
            </h2>
            <p className="text-xs text-[#8b949e] mb-4">
              Create a new repository for your prompt. You can version, refine, and compare it anytime.
            </p>

            <div className="space-y-4 mb-5 overflow-y-auto pr-1">
              {/* Repository Name (Smart generated from prompt, user editable) */}
              <div>
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-1.5">
                  Repository name <span className="text-[#f85149]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saveRepoName}
                  onChange={(e) => setSaveRepoName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="e.g. customer-support-agent"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] font-mono"
                />
                <span className="text-[10px] text-[#8b949e] mt-1 block">
                  Generated automatically according to prompt topic.
                </span>
              </div>

              {/* Prompt / Code Content to be saved in system_prompt.md */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#c9d1d9] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Prompt Content</span>
                    <span className="text-[10px] text-[#8b949e] font-mono">
                      (system_prompt.md)
                    </span>
                  </label>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                    {saveTargetPrompt ? saveTargetPrompt.split('\n').length : 0} lines • {saveTargetPrompt ? saveTargetPrompt.length : 0} bytes
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={saveTargetPrompt}
                  onChange={(e) => setSaveTargetPrompt(e.target.value)}
                  placeholder="The complete prompt or code to be saved in system_prompt.md..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-xs text-[#f0f6fc] font-mono leading-relaxed focus:outline-none focus:border-[#58a6ff] resize-y"
                />
                <span className="text-[10px] text-[#8b949e] mt-1 block">
                  The entire code/prompt above will be committed as v1.0. You can review or edit it before creating.
                </span>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-1.5">Description</label>
                <input
                  type="text"
                  value={saveRepoDesc}
                  onChange={(e) => setSaveRepoDesc(e.target.value)}
                  placeholder="Short description of this prompt"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-1.5">Category</label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                >
                  <option value="Coding">Coding</option>
                  <option value="Research">Research</option>
                  <option value="Education">Education</option>
                  <option value="Writing">Writing</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Visibility: PRIVATE by default! */}
              <div>
                <label className="block text-xs font-semibold text-[#c9d1d9] mb-2">Visibility</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#c9d1d9]">
                    <input
                      type="radio"
                      name="save_vis"
                      value="Private"
                      checked={saveVisibility === "Private"}
                      onChange={() => setSaveVisibility("Private")}
                      className="accent-[#1f6feb]"
                    />
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#e3b341]" />
                      <span className="font-medium text-[#f0f6fc]">Private</span>
                      <span className="text-[11px] text-[#8b949e]">(Default - Only you can see this repo)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#c9d1d9]">
                    <input
                      type="radio"
                      name="save_vis"
                      value="Public"
                      checked={saveVisibility === "Public"}
                      onChange={() => setSaveVisibility("Public")}
                      className="accent-[#1f6feb]"
                    />
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#3fb950]" />
                      <span className="font-medium text-[#f0f6fc]">Public</span>
                      <span className="text-[11px] text-[#8b949e]">(Visible to community on Explore)</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#30363d]">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-medium px-4 py-2 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSaveRepo}
                disabled={isCreatingRepo || !saveRepoName.trim()}
                className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-semibold px-4 py-2 rounded-md flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                {isCreatingRepo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Create repository</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FORK MODAL (for community prompts)
         ======================================================== */}
      {forkModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-base font-semibold text-[#f0f6fc] flex items-center gap-2 mb-2">
              <GitFork className="w-5 h-5 text-[#58a6ff]" />
              Fork repository
            </h2>
            <p className="text-xs text-[#8b949e] mb-5">
              Fork this prompt into your own account so you can enhance and version control it.
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
                      name="dash_fork_vis"
                      value="Private"
                      checked={forkVisibility === "Private"}
                      onChange={() => setForkVisibility("Private")}
                      className="accent-[#1f6feb]"
                    />
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#e3b341]" />
                      <span className="font-medium text-[#f0f6fc]">Private</span>
                      <span className="text-[11px] text-[#8b949e]">(Default - Only you can see this repo)</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#c9d1d9]">
                    <input
                      type="radio"
                      name="dash_fork_vis"
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
                onClick={() => setForkModalRepo(null)}
                className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-xs font-medium px-4 py-2 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteFork}
                disabled={isForking}
                className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-semibold px-4 py-2 rounded-md flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                {isForking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Forking...</span>
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
