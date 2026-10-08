"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Book } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { addCreatedRepoId } from "../../lib/repoStore";

import { API_URL } from "../../lib/api";

export default function CreateRepositoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Coding",
    visibility: "Private",
    initial_prompt: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const query = user?.id ? `?user_id=${user.id}` : '';
      const res = await fetch(`${API_URL}/api/repositories${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create repository");
      addCreatedRepoId(data.id);
      router.push(`/repo/${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="border-b border-border pb-6 mb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          Create a new prompt repository
        </h1>
        <p className="text-muted mt-2 text-sm">
          A repository contains all the versions, history, and context for a specific AI prompt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-md text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Repository name <span className="text-danger">*</span></label>
            <input 
              required
              type="text" 
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-accent transition"
              placeholder="e.g. research-assistant"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Category</label>
            <select 
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-accent transition"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              <option>Coding</option>
              <option>Research</option>
              <option>Education</option>
              <option>Writing</option>
              <option>Productivity</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold">Description</label>
          <input 
            type="text" 
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-accent transition"
            placeholder="Prompt for analyzing academic research papers."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <label className="block text-sm font-semibold mb-3">Visibility</label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="radio" 
                name="visibility" 
                value="Public"
                checked={formData.visibility === "Public"}
                onChange={e => setFormData({...formData, visibility: e.target.value})}
                className="mt-1"
              />
              <div>
                <span className="block font-medium group-hover:text-accent transition text-sm">Public</span>
                <span className="text-xs text-muted">Anyone on the internet can see this repository. You choose who can commit.</span>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="radio" 
                name="visibility" 
                value="Private"
                checked={formData.visibility === "Private"}
                onChange={e => setFormData({...formData, visibility: e.target.value})}
                className="mt-1"
              />
              <div>
                <span className="block font-medium group-hover:text-accent transition text-sm">Private</span>
                <span className="text-xs text-muted">You choose who can see and commit to this repository.</span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <label className="block text-sm font-semibold">Initial Prompt Content (Optional)</label>
          <textarea 
            rows={5}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition mono"
            placeholder="You are a helpful AI assistant..."
            value={formData.initial_prompt}
            onChange={e => setFormData({...formData, initial_prompt: e.target.value})}
          />
        </div>

        <div className="pt-6">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition"
          >
            {loading ? "Creating..." : "Create repository"}
          </button>
        </div>
      </form>
    </div>
  );
}
