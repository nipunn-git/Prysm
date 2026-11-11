"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FolderPlus, 
  Globe, 
  Lock, 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Loader2, 
  Code2,
  ChevronDown
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { addCreatedRepoId } from "../../lib/repoStore";
import { API_URL } from "../../lib/api";
import { GridPulse } from "@/components/ui/grid-pulse";

export default function CreateRepositoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Coding",
    visibility: "Public",
    initial_prompt: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const categories = ["Coding", "Research", "Education", "Writing", "Productivity", "Other"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Repository name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('prysm_token') || localStorage.getItem('prompthub_token')) : null;
      const effectiveUserId = user?.id || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('prysm_user') || localStorage.getItem('prompthub_user') || '{}')?.id) : null);
      
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
          ...formData,
          name: formData.name.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create repository");
      addCreatedRepoId(data.id);
      router.push(`/repo/${data.id}`);
    } catch (err) {
      setError(err.message || "Failed to create repository.");
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-[calc(100vh-64px)] relative overflow-x-hidden transition-colors duration-300 font-apple pb-24 ${
      isDark ? "bg-[#05070c] text-[#f5f5f7]" : "bg-[#f8fafc] text-[#1d1d1f]"
    }`}>
      {/* Background Interactive Canvas GridPulse */}
      <GridPulse cell={28} reach={2.8} ambient={3} className="opacity-35 dark:opacity-20 pointer-events-none fixed inset-0 z-0" />

      {/* Main Container */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 sm:py-10">
        
        {/* Back Link */}
        <div className="mb-4">
          <button 
            type="button"
            onClick={() => router.back()}
            className={`inline-flex items-center gap-1.5 text-xs font-medium transition cursor-pointer ${
              isDark ? 'text-[#86868b] hover:text-[#f5f5f7]' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Frosted Glass Form Card */}
        <div className={`rounded-3xl border transition-all duration-300 shadow-2xl p-6 sm:p-8 relative ${
          isDark 
            ? "bg-[#090b10]/65 backdrop-blur-3xl border-white/[0.12] shadow-[0_25px_70px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)]" 
            : "bg-white/65 backdrop-blur-3xl border-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)]"
        }`}>
          
          {/* Card Header */}
          <div className="flex items-start gap-3.5 mb-6 pb-5 border-b border-inherit">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${
              isDark 
                ? 'bg-[#2997ff]/15 border-[#2997ff]/30 text-[#2997ff]' 
                : 'bg-blue-50 border-[#0071e3]/20 text-[#0071e3]'
            }`}>
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                Create a new prompt repository
              </h1>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                A repository contains version history, revisions, and system instructions for your prompt.
              </p>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-2xl text-xs font-medium animate-fadeIn">
                {error}
              </div>
            )}

            {/* Row: Name and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Repository Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 tracking-tight">
                  Repository Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. system-architect"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none transition-all ${
                      isDark 
                        ? "bg-black/30 border-white/[0.12] text-[#f5f5f7] focus:border-[#2997ff]" 
                        : "bg-black/[0.02] border-black/[0.08] text-[#1d1d1f] focus:border-[#0071e3]"
                    }`}
                  />
                </div>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                  Use lowercase letters and dashes.
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 tracking-tight">
                  Category
                </label>
                <div className="relative">
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none transition-all appearance-none cursor-pointer ${
                      isDark 
                        ? "bg-[#090b10] border-white/[0.12] text-[#f5f5f7] focus:border-[#2997ff]" 
                        : "bg-white border-black/[0.08] text-[#1d1d1f] focus:border-[#0071e3]"
                    }`}
                  >
                    {categories.map(c => (
                      <option key={c} value={c} className={isDark ? "bg-[#12141a] text-white" : "bg-white text-black"}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#86868b] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-tight">
                Description <span className={`text-[11px] font-normal ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>(optional)</span>
              </label>
              <input 
                type="text" 
                placeholder="Brief summary of what this AI prompt is designed to do..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className={`w-full border rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none transition-all ${
                  isDark 
                    ? "bg-black/30 border-white/[0.12] text-[#f5f5f7] focus:border-[#2997ff]" 
                    : "bg-black/[0.02] border-black/[0.08] text-[#1d1d1f] focus:border-[#0071e3]"
                }`}
              />
            </div>

            {/* Visibility Cards */}
            <div>
              <label className="block text-xs font-semibold mb-2 tracking-tight">
                Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Public Card */}
                <div 
                  onClick={() => setFormData({ ...formData, visibility: "Public" })}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3 backdrop-blur-md ${
                    formData.visibility === "Public"
                      ? isDark
                        ? "border-[#2997ff] bg-[#2997ff]/10 shadow-[0_0_15px_rgba(41,151,255,0.15)]"
                        : "border-[#0071e3] bg-blue-50/70 shadow-sm"
                      : isDark
                        ? "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
                        : "border-black/[0.06] bg-black/[0.015] hover:bg-black/[0.03]"
                  }`}
                >
                  <div className={`p-2 rounded-xl border mt-0.5 shrink-0 ${
                    formData.visibility === "Public"
                      ? isDark ? "bg-[#2997ff]/20 border-[#2997ff]/40 text-[#2997ff]" : "bg-blue-100 border-[#0071e3]/30 text-[#0071e3]"
                      : isDark ? "bg-white/5 border-white/10 text-[#86868b]" : "bg-black/5 border-black/10 text-[#86868b]"
                  }`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-tight">Public</span>
                      {formData.visibility === "Public" && (
                        <Check className={`w-3.5 h-3.5 ${isDark ? 'text-[#2997ff]' : 'text-[#0071e3]'}`} />
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                      Anyone on the internet can explore, like, and fork this prompt.
                    </p>
                  </div>
                </div>

                {/* Private Card */}
                <div 
                  onClick={() => setFormData({ ...formData, visibility: "Private" })}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3 backdrop-blur-md ${
                    formData.visibility === "Private"
                      ? isDark
                        ? "border-[#2997ff] bg-[#2997ff]/10 shadow-[0_0_15px_rgba(41,151,255,0.15)]"
                        : "border-[#0071e3] bg-blue-50/70 shadow-sm"
                      : isDark
                        ? "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
                        : "border-black/[0.06] bg-black/[0.015] hover:bg-black/[0.03]"
                  }`}
                >
                  <div className={`p-2 rounded-xl border mt-0.5 shrink-0 ${
                    formData.visibility === "Private"
                      ? isDark ? "bg-[#2997ff]/20 border-[#2997ff]/40 text-[#2997ff]" : "bg-blue-100 border-[#0071e3]/30 text-[#0071e3]"
                      : isDark ? "bg-white/5 border-white/10 text-[#86868b]" : "bg-black/5 border-black/10 text-[#86868b]"
                  }`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-tight">Private</span>
                      {formData.visibility === "Private" && (
                        <Check className={`w-3.5 h-3.5 ${isDark ? 'text-[#2997ff]' : 'text-[#0071e3]'}`} />
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>
                      Only you can view and edit this prompt in your workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Initial Prompt Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold tracking-tight">
                  Initial Prompt Instructions <span className={`text-[11px] font-normal ${isDark ? 'text-[#86868b]' : 'text-[#86868b]'}`}>(v1.0)</span>
                </label>
                <div className="flex items-center gap-1 text-[11px] text-[#86868b]">
                  <Code2 className="w-3 h-3" />
                  <span>system_prompt.md</span>
                </div>
              </div>
              <textarea 
                rows={6}
                placeholder="You are an expert AI assistant that specializes in..."
                value={formData.initial_prompt}
                onChange={e => setFormData({ ...formData, initial_prompt: e.target.value })}
                className={`w-full border rounded-2xl p-3.5 text-xs sm:text-[13px] font-apple-mono focus:outline-none transition-all leading-relaxed ${
                  isDark 
                    ? "bg-black/35 border-white/[0.12] text-slate-200 focus:border-[#2997ff]" 
                    : "bg-black/[0.025] border-black/[0.08] text-[#1d1d1f] focus:border-[#0071e3]"
                }`}
              />
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t border-inherit flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={() => router.back()}
                className={`text-xs font-medium px-4 py-2 rounded-xl border transition cursor-pointer ${
                  isDark 
                    ? 'border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[#f5f5f7]' 
                    : 'border-black/[0.08] bg-black/[0.03] hover:bg-black/[0.06] text-[#1d1d1f]'
                }`}
              >
                Cancel
              </button>

              <button 
                type="submit" 
                disabled={loading}
                className="bg-[#0071e3] dark:bg-[#2997ff] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating repository...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create repository</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
