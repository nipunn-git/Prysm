// Client-side repository and user data store for PromptHub
// Ensures no demo data is shown to the user and tracks user-created / user-forked repos

const USER_REPOS_KEY = "prompthub_my_repo_ids";
const FORK_METADATA_KEY = "prompthub_forks_map";
const STARRED_REPOS_KEY = "prompthub_starred_repos";

// Known demo repository IDs and demo names from the initial backend seed
export const DEMO_REPO_IDS = new Set([
  "repo_research_01",
  "repo_coding_01",
  "repo_resume_01",
  "repo_sql_01",
  "repo_cot_01",
  "repo_reviewer_01",
  "repo_pipeline_01"
]);

export const DEMO_REPO_NAMES = new Set([
  "dsa-notes-generator",
  "create-an-expert-code-reviewer",
  "customer-support-refund-bot",
  "research-assistant",
  "coding-tutor",
  "resume-analyzer",
  "sql-query-generator",
  "chain-of-thought-reasoner",
  "fullstack-code-reviewer",
  "text-to-sql-pipeline"
]);

/**
 * Get all repository IDs created, cloned, or forked by the user
 */
export function getUserRepoIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_REPOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error reading user repo ids:", e);
    return [];
  }
}

/**
 * Add a repository ID to the user's created/forked list
 */
export function addCreatedRepoId(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = getUserRepoIds();
    if (!current.includes(id)) {
      const updated = [id, ...current];
      localStorage.setItem(USER_REPOS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error("Error adding created repo id:", e);
  }
}

/**
 * Remove a repository ID
 */
export function removeCreatedRepoId(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = getUserRepoIds();
    const updated = current.filter(item => item !== id);
    localStorage.setItem(USER_REPOS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error removing repo id:", e);
  }
}

/**
 * Check if a repo was made/forked by this user
 */
export function isUserRepo(repoOrId) {
  const id = typeof repoOrId === "object" ? repoOrId?.id : repoOrId;
  if (!id) return false;
  const userIds = getUserRepoIds();
  return userIds.includes(id);
}

/**
 * Filter an array of repositories so that ONLY user-created or user-forked repos are returned.
 * Excludes all demo/seed data unless specifically created by user in this session.
 */
export function filterUserRepos(allRepos = []) {
  if (!Array.isArray(allRepos)) return [];
  const userIds = getUserRepoIds();
  const userSet = new Set(userIds);
  
  return allRepos.filter(repo => {
    if (!repo || !repo.id) return false;
    
    // If it's a known demo repo and user hasn't explicitly saved it in their session, hide it
    if (DEMO_REPO_IDS.has(repo.id) && !userSet.has(repo.id)) {
      return false;
    }
    
    // Otherwise, show it! This ensures repos created on other devices are shown.
    return true;
  });
}

/**
 * Save fork metadata linking a new repo to its parent
 */
export function saveForkInfo(forkedRepoId, originalRepo) {
  if (typeof window === "undefined" || !forkedRepoId || !originalRepo) return;
  try {
    const raw = localStorage.getItem(FORK_METADATA_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[forkedRepoId] = {
      id: originalRepo.id,
      name: originalRepo.name,
      owner_name: originalRepo.owner_name || "community",
      category: originalRepo.category
    };
    localStorage.setItem(FORK_METADATA_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Error saving fork info:", e);
  }
}

/**
 * Retrieve fork metadata if the repo was forked
 */
export function getForkInfo(repoId) {
  if (typeof window === "undefined" || !repoId) return null;
  try {
    const raw = localStorage.getItem(FORK_METADATA_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[repoId] || null;
  } catch (e) {
    return null;
  }
}

/**
 * Starred repositories management
 */
export function getStarredRepoIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STARRED_REPOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function isRepoStarred(id) {
  return getStarredRepoIds().includes(id);
}

export function toggleStarRepo(id) {
  if (typeof window === "undefined" || !id) return false;
  try {
    const current = getStarredRepoIds();
    let updated;
    let nowStarred;
    if (current.includes(id)) {
      updated = current.filter(item => item !== id);
      nowStarred = false;
    } else {
      updated = [...current, id];
      nowStarred = true;
    }
    localStorage.setItem(STARRED_REPOS_KEY, JSON.stringify(updated));
    return nowStarred;
  } catch (e) {
    return false;
  }
}

/**
 * Intelligently generate a semantic kebab-case repository name based on prompt text and/or query
 */
export function generateRepoName(promptText = "", userQuery = "") {
  // If there's a title in the prompt (e.g., # System Prompt: Python Unit Tester)
  const titleMatch = promptText.match(/^#+\s*(?:System Prompt:?\s*)?([^\n\r]+)/im);
  let candidate = titleMatch ? titleMatch[1].trim() : "";
  
  if (!candidate || candidate.length < 3) {
    candidate = userQuery.trim();
  }

  if (!candidate) {
    candidate = "prompt-repository";
  }

  // Remove common filler words
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "for", "with", "to", "in", "of",
    "please", "create", "make", "build", "generate", "write", "draft", "give", "me"
  ]);

  const words = candidate
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));

  const selectedWords = words.length > 0 ? words.slice(0, 4) : ["prompt", "repo"];
  let repoName = selectedWords.join("-");

  // Ensure it doesn't end with hyphen and has valid length
  repoName = repoName.replace(/^-+|-+$/g, "");
  if (repoName.length < 3) {
    repoName = "ai-prompt-repository";
  }

  return repoName;
}
