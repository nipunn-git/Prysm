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
  X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { 
  filterUserRepos, 
  addCreatedRepoId, 
  saveForkInfo, 
  generateRepoName 
} from "../../lib/repoStore";

import { API_URL } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  // Repositories state
  const [repos, setRepos] = useState([]);
  const [communityRepos, setCommunityRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repoSearch, setRepoSearch] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // AI Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatError, setChatError] = useState(null);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

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
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      if (!effectiveUserId) {
        setLoading(false);
        return;
      }
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};
      const res = await fetch(`${API_URL}/api/repositories?user_id=${encodeURIComponent(effectiveUserId)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }

      // Separately fetch public community prompts so user can explore & fork them (excluding their own)
      const expRes = await fetch(`${API_URL}/api/repositories/explore?user_id=${encodeURIComponent(effectiveUserId)}`, { headers });
      if (expRes.ok) {
        const expData = await expRes.json();
        setCommunityRepos(Array.isArray(expData) ? expData : []);
      }
    } catch (e) {
      console.error("Failed to fetch repositories:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);


  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('prompthub_token') : null;
      if (!storedToken) {
        router.replace('/login');
        return;
      }
    }
    fetchRepos();
  }, [authLoading, user, router, fetchRepos]);

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
  }, []);

  // Send a chat message to AI (AI answers in chat WITHOUT auto-creating repo)
  const sendMessage = async (overrideText) => {
    const msgText = overrideText || chatInput.trim();
    if (!msgText || isAiThinking) return;

    const userMsg = { role: "user", content: msgText };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setIsAiThinking(true);
    setChatError(null);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          user_id: user?.id || null,
          create_repo: false, // Do NOT auto-create repo without user action!
          visibility: "Private"
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to get AI response");
      }

      const data = await res.json();
      
      const assistantMsg = {
        role: "assistant",
        content: data.reply,
        userQuery: msgText,
        suggested_actions: ["save_as_repo", "copy_prompt"]
      };
      
      setChatMessages([...newMessages, assistantMsg]);

    } catch (err) {
      console.error("Chat error:", err);
      setChatError(err.message || "Failed to get AI response");
      setChatMessages([...newMessages, {
        role: "assistant",
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        isError: true
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Open Save as Repository modal with smart repo name according to the prompt
  const openSaveAsRepoModal = (promptContent, userQuery) => {
    // Extract actual prompt if enclosed in code blocks
    let cleanPrompt = promptContent;
    const codeMatch = promptContent.match(/```(?:prompt|markdown|)?\n([\s\S]*?)```/);
    if (codeMatch) {
      cleanPrompt = codeMatch[1].trim();
    }

    // Generate intelligent kebab-case repo name according to the prompt
    const smartName = generateRepoName(cleanPrompt, userQuery);
    
    // Infer category
    const qLower = (userQuery + " " + cleanPrompt).toLowerCase();
    let cat = "Productivity";
    if (qLower.includes("code") || qLower.includes("sql") || qLower.includes("python") || qLower.includes("bug")) {
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
    const codeMatch = text.match(/```(?:prompt|markdown|)?\n([\s\S]*?)```/);
    const toCopy = codeMatch ? codeMatch[1].trim() : text;
    navigator.clipboard.writeText(toCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter user repositories based on search
  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  // Quick action pills
  const quickActions = [
    { label: "Optimize Prompt", icon: Zap, iconColor: "text-[#e3b341]", query: "Optimize a prompt for token efficiency and strict JSON response" },
    { label: "Agent Prompt", icon: Bot, iconColor: "text-[#58a6ff]", query: "Create an autonomous agent prompt with tool calling and self-correction" },
    { label: "Benchmark Test", icon: FlaskConical, iconColor: "text-[#3fb950]", query: "Create a benchmark evaluation prompt for comparing AI model outputs" },
    { label: "System Instructions", icon: FileCode2, iconColor: "text-[#8b949e]", query: "Create system instructions for code generation with constraints and tests" },
    { label: "Version Diff", icon: GitCompare, iconColor: "text-[#8b949e]", query: "Help me compare and analyze differences between prompt versions" },
  ];

  // Render markdown-like chat content
  const renderMessageContent = (content) => {
    if (!content) return null;
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const lang = lines[0].replace("```", "").trim();
        const code = lines.slice(1, -1).join("\n");
        return (
          <div key={idx} className="my-3 rounded-lg border border-[#30363d] overflow-hidden bg-[#0d1117]">
            <div className="bg-[#161b22] border-b border-[#30363d] px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] text-[#8b949e] font-mono">{lang || "prompt"}</span>
              <button 
                onClick={() => handleCopy(code, `code-${idx}`)}
                className="text-[#8b949e] hover:text-[#f0f6fc] p-0.5 rounded transition"
                title="Copy prompt"
              >
                {copiedId === `code-${idx}` ? (
                  <CheckCircle className="w-3.5 h-3.5 text-[#3fb950]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <pre className="p-3 text-xs font-mono text-[#c9d1d9] whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {code}
            </pre>
          </div>
        );
      }
      
      const formatted = part
        .split("\n")
        .map((line, lineIdx) => {
          if (line.startsWith("## ")) {
            return <h3 key={lineIdx} className="text-sm font-bold text-[#f0f6fc] mt-3 mb-1.5">{line.replace("## ", "")}</h3>;
          }
          if (line.startsWith("### ")) {
            return <h4 key={lineIdx} className="text-xs font-bold text-[#f0f6fc] mt-2 mb-1">{line.replace("### ", "")}</h4>;
          }
          let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#f0f6fc] font-semibold">$1</strong>');
          processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
          processed = processed.replace(/`([^`]+)`/g, '<code class="bg-[#161b22] border border-[#30363d] px-1 py-0.5 rounded text-[11px] text-[#e3b341] font-mono">$1</code>');
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return <li key={lineIdx} className="ml-3 text-xs leading-relaxed list-disc" dangerouslySetInnerHTML={{ __html: processed.replace(/^[-*]\s/, "") }} />;
          }
          if (!line.trim()) return <br key={lineIdx} />;
          return <p key={lineIdx} className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />;
        });
      
      return <div key={idx}>{formatted}</div>;
    });
  };

  return (
    <div className="w-full max-w-[1540px] mx-auto px-4 sm:px-6 py-6 min-h-[calc(100vh-56px)] bg-[#010409]">
      <div className="flex gap-6 lg:gap-8 items-start relative">
        
        {/* ========================================================
            LEFT COLUMN: Top repositories (User Created Only!)
           ======================================================== */}
        {!isSidebarCollapsed && (
          <aside className="w-full md:w-[300px] lg:w-[320px] shrink-0 border-r border-[#21262d] md:pr-6 relative">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[#f0f6fc]">Top repositories</h2>
              <Link 
                href="/new" 
                className="bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043]/60 text-white text-xs font-medium px-2.5 py-1 rounded-md transition flex items-center gap-1.5 shadow-sm"
              >
                <Book className="w-3.5 h-3.5" />
                New
              </Link>
            </div>

            {/* Filter Input */}
            <div className="relative mb-3">
              <input 
                type="text" 
                placeholder="Find a repository..." 
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#c9d1d9] placeholder:text-[#8b949e] focus:outline-none focus:border-[#58a6ff] transition"
              />
            </div>

            {/* Repository List - Only user-created repositories, NO demo data! */}
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-4 text-xs text-[#8b949e] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#58a6ff]" />
                  <span>Loading your repositories...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                /* GitHub-style Empty State */
                <div className="py-6 px-3 border border-[#30363d] border-dashed rounded-lg bg-[#0d1117] text-center my-2">
                  <Book className="w-6 h-6 mx-auto mb-2 text-[#8b949e]/60" />
                  <p className="text-xs font-medium text-[#c9d1d9] mb-1">No repositories yet</p>
                  <p className="text-[11px] text-[#8b949e] mb-3 leading-relaxed">
                    Repositories you create with AI or fork from the community will appear here.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Link
                      href="/new"
                      className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-xs font-medium text-[#f0f6fc] py-1 px-2.5 rounded transition"
                    >
                      + Create repository
                    </Link>
                    <Link
                      href="/explore"
                      className="text-[11px] text-[#58a6ff] hover:underline flex items-center justify-center gap-1 pt-1"
                    >
                      <Compass className="w-3 h-3" />
                      Explore public prompts
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {filteredRepos.map((repo) => (
                    <li key={repo.id} className="flex items-center gap-2 group">
                      <div className="w-4 h-4 rounded-full bg-[#21262d] border border-[#30363d] overflow-hidden shrink-0 flex items-center justify-center">
                        <span className="text-[9px] text-[#8b949e] font-bold">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <Link 
                        href={`/repo/${repo.id}`} 
                        className="text-xs font-semibold text-[#c9d1d9] group-hover:text-[#58a6ff] group-hover:underline truncate flex items-center gap-1.5 flex-1 min-w-0"
                      >
                        <span className="font-normal text-[#8b949e]">
                          {user?.username || 'user'}/
                        </span>
                        <span className="truncate">{repo.name}</span>
                        {repo.visibility?.toLowerCase() === 'private' ? (
                          <Lock className="w-2.5 h-2.5 text-[#8b949e] shrink-0" title="Private repository" />
                        ) : (
                          <Globe className="w-2.5 h-2.5 text-[#3fb950] shrink-0" title="Public repository" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Collapse button on vertical edge */}
            <button 
              onClick={() => setIsSidebarCollapsed(true)}
              title="Collapse sidebar"
              className="hidden md:flex absolute -right-3 top-28 w-6 h-6 rounded-full bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] items-center justify-center shadow-md z-10 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </aside>
        )}

        {/* Expand button if sidebar is collapsed */}
        {isSidebarCollapsed && (
          <button 
            onClick={() => setIsSidebarCollapsed(false)}
            title="Expand sidebar"
            className="hidden md:flex shrink-0 w-6 h-6 rounded-full bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] items-center justify-center shadow-md transition mt-2"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* ========================================================
            CENTER COLUMN: AI Chat & Prompt Crafting
           ======================================================== */}
        <main className="flex-1 min-w-0 max-w-[840px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-[#f0f6fc] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#58a6ff]" />
              PromptHub AI
            </h1>
            {chatMessages.length > 0 && (
              <button 
                onClick={() => setChatMessages([])}
                className="text-xs text-[#8b949e] hover:text-[#f0f6fc] flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
            )}
          </div>

          {/* Chat Container */}
          <div 
            className="rounded-xl border border-[#30363d] bg-[#0d1117] shadow-lg overflow-hidden flex flex-col" 
            style={{ minHeight: "calc(100vh - 200px)", maxHeight: "calc(100vh - 160px)" }}
          >
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                /* Welcome / Starter View */
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1f6feb] to-[#8b5cf6] flex items-center justify-center mb-5 shadow-lg shadow-[#1f6feb]/20">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-[#f0f6fc] mb-2">PromptHub AI</h2>
                  <p className="text-xs text-[#8b949e] mb-6 max-w-md leading-relaxed">
                    Your AI prompt engineering assistant. Create production-ready prompts, 
                    iterate via chat, and save them directly as private repositories.
                  </p>

                  {/* Quick Action Pills */}
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {quickActions.map((action, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setChatInput(action.query);
                          chatInputRef.current?.focus();
                        }}
                        className="bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-[#f0f6fc] text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <action.icon className={`w-3.5 h-3.5 ${action.iconColor}`} />
                        {action.label}
                      </button>
                    ))}
                  </div>

                  {/* Starter Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {[
                      "Create a customer support chatbot prompt",
                      "Build a code review agent system prompt",
                      "Design a research paper analyzer prompt",
                      "Make a SQL query generator prompt"
                    ].map((starter, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(starter)}
                        className="text-left bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#8b949e]/50 rounded-lg px-3 py-2.5 text-xs text-[#c9d1d9] hover:text-[#f0f6fc] transition flex items-center gap-2 group"
                      >
                        <ArrowRight className="w-3 h-3 text-[#8b949e] group-hover:text-[#58a6ff] shrink-0 transition" />
                        <span>{starter}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1f6feb] to-[#8b5cf6] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
                      <div className={`rounded-xl px-4 py-3 ${
                        msg.role === "user" 
                          ? "bg-[#1f6feb] text-white ml-auto" 
                          : msg.isError 
                            ? "bg-[#da3633]/10 border border-[#da3633]/30 text-[#f85149]"
                            : "bg-[#161b22] border border-[#30363d] text-[#c9d1d9]"
                      }`}>
                        {msg.role === "user" ? (
                          <p className="text-xs leading-relaxed">{msg.content}</p>
                        ) : (
                          <div className="prose-sm">
                            {renderMessageContent(msg.content)}
                          </div>
                        )}
                      </div>

                      {/* Repo Created Success Card (if created) */}
                      {msg.repo_created && (
                        <div className="mt-2 border border-[#1b4b27] bg-[#041d11]/80 rounded-lg p-3 flex items-center justify-between gap-3 shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-[#238636]/30 border border-[#238636] flex items-center justify-center shrink-0">
                              <Book className="w-4 h-4 text-[#3fb950]" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-[#3fb950] flex items-center gap-1.5">
                                Private Repository Created
                                <Lock className="w-3 h-3 text-[#e3b341]" />
                              </div>
                              <div className="text-[11px] text-[#8b949e] font-mono">{msg.repo_created.name}</div>
                            </div>
                          </div>
                          <Link
                            href={`/repo/${msg.repo_created.id}`}
                            className="bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-semibold px-3 py-1.5 rounded-md flex items-center gap-1 transition shadow-sm whitespace-nowrap"
                          >
                            View Repository
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}

                      {/* Action Buttons for AI responses: Save to Repo, Copy */}
                      {msg.role === "assistant" && !msg.isError && !msg.repo_created && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleCopy(msg.content, `msg-${idx}`)}
                            className="text-[#8b949e] hover:text-[#f0f6fc] p-1.5 rounded hover:bg-[#21262d] transition flex items-center gap-1 text-[11px]"
                            title="Copy prompt"
                          >
                            {copiedId === `msg-${idx}` ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-[#3fb950]" />
                                <span className="text-[#3fb950]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Save as Repository button with smart naming according to prompt */}
                          <button
                            onClick={() => openSaveAsRepoModal(msg.content, msg.userQuery)}
                            className="bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#f0f6fc] hover:text-white px-2.5 py-1 rounded transition flex items-center gap-1.5 text-[11px] font-medium shadow-sm"
                            title="Save as Private Repository"
                          >
                            <Save className="w-3.5 h-3.5 text-[#3fb950]" />
                            <span>Save as Repo</span>
                            <Lock className="w-2.5 h-2.5 text-[#e3b341] ml-0.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-3.5 h-3.5 text-[#8b949e]" />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* AI Thinking Indicator */}
              {isAiThinking && (
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1f6feb] to-[#8b5cf6] flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                      <span className="text-xs text-[#8b949e] animate-pulse">PromptHub AI is crafting your prompt...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="border-t border-[#21262d] bg-[#0d1117] p-3">
              {chatError && (
                <div className="text-xs text-[#da3633] mb-2 px-1 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {chatError}
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
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
                    placeholder="Ask PromptHub AI to create, optimize, or explain prompts..."
                    rows={1}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2.5 text-sm text-[#f0f6fc] placeholder:text-[#8b949e] focus:outline-none focus:border-[#58a6ff] transition resize-none"
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                    onInput={(e) => {
                      e.target.style.height = "40px";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    disabled={isAiThinking}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => sendMessage()}
                    disabled={isAiThinking || !chatInput.trim()}
                    className="w-10 h-10 rounded-lg bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:opacity-50 text-white flex items-center justify-center transition shadow-sm"
                    title="Send message"
                  >
                    {isAiThinking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick actions row */}
              {chatMessages.length === 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[11px] text-[#8b949e]">Quick:</span>
                  {quickActions.slice(0, 3).map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => setChatInput(action.query)}
                      className="text-[11px] text-[#8b949e] hover:text-[#58a6ff] transition"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ========================================================
            RIGHT COLUMN: Recent Repos & Community Prompts to Fork
           ======================================================== */}
        <aside className="w-[300px] shrink-0 hidden xl:block sticky top-20 space-y-4">
          
          {/* Recent Repositories (User data only) */}
          <div className="border border-[#30363d] bg-[#0d1117] rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[#f0f6fc] mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Book className="w-4 h-4 text-[#8b949e]" />
                Recent Repositories
              </span>
              <span className="text-[11px] font-mono text-[#8b949e]">{repos.length}</span>
            </h2>

            {repos.length === 0 ? (
              <div className="text-center py-4 text-xs text-[#8b949e]">
                <p>No repositories created yet.</p>
                <Link href="/new" className="text-[#58a6ff] hover:underline mt-1 block font-medium">
                  + Create your first repo
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {repos.slice(0, 5).map((repo) => (
                  <Link 
                    key={repo.id} 
                    href={`/repo/${repo.id}`}
                    className="block group"
                  >
                    <div className="flex items-start gap-2">
                      <Book className="w-3.5 h-3.5 text-[#8b949e] mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#58a6ff] group-hover:underline truncate flex items-center gap-1">
                          {repo.name}
                          {repo.visibility?.toLowerCase() === 'private' ? (
                            <Lock className="w-2.5 h-2.5 text-[#8b949e]" />
                          ) : (
                            <Globe className="w-2.5 h-2.5 text-[#3fb950]" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#8b949e] truncate">{repo.description || "Prompt repository"}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[#8b949e]">{repo.category}</span>
                          <span className="text-[10px] text-[#8b949e] font-mono">{repo.latest_version || "v1.0"}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Public Community Prompts (Explore & Fork) */}
          <div className="border border-[#30363d] bg-[#0d1117] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#f0f6fc] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#58a6ff]" />
                Trending in Community
              </h2>
              <Link href="/explore" className="text-[11px] text-[#58a6ff] hover:underline">
                Explore all →
              </Link>
            </div>
            
            <p className="text-[11px] text-[#8b949e] mb-3">
              Use other users' public prompts and enhance them in your own repo by forking.
            </p>

            <div className="space-y-3">
              {communityRepos.slice(0, 4).map((cRepo) => (
                <div key={cRepo.id} className="border border-[#21262d] rounded-lg p-2.5 bg-[#161b22]/50 hover:border-[#30363d] transition">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <Link 
                      href={`/repo/${cRepo.id}`}
                      className="text-xs font-semibold text-[#58a6ff] hover:underline truncate"
                    >
                      {cRepo.name}
                    </Link>
                    <span className="text-[9px] border border-[#30363d] text-[#8b949e] px-1 py-0.2 rounded font-mono shrink-0">
                      {cRepo.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#8b949e] line-clamp-2 mb-2">
                    {cRepo.description || "Public AI prompt."}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#21262d]">
                    <span className="text-[10px] text-[#8b949e]">by {cRepo.owner_name}</span>
                    <button
                      onClick={() => {
                        setForkModalRepo(cRepo);
                        setForkRepoName(cRepo.name);
                        setForkVisibility("Private");
                      }}
                      className="bg-[#21262d] hover:bg-[#30363d] text-[10px] font-semibold text-[#c9d1d9] hover:text-white px-2 py-0.5 rounded flex items-center gap-1 transition"
                    >
                      <GitFork className="w-2.5 h-2.5" />
                      Fork
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </aside>

      </div>

      {/* ========================================================
          SAVE TO REPO MODAL (Auto repo name from prompt, Private by default)
         ======================================================== */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-base font-semibold text-[#f0f6fc] flex items-center gap-2 mb-2">
              <Save className="w-5 h-5 text-[#3fb950]" />
              Save Prompt as Repository
            </h2>
            <p className="text-xs text-[#8b949e] mb-5">
              Create a new repository for your prompt. You can version, refine, and compare it anytime.
            </p>

            <div className="space-y-4 mb-6">
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
