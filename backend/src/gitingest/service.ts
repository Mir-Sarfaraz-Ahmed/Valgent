import { TTLCache } from './cache';

export interface GitIngestResult {
  ingest_id: string;
  repository_url: string;
  digest_text: string;      // full LLM-ready repo dump
  file_tree: string;        // directory tree section
  estimated_tokens: number;
  fetched_at: string;
}

const BASE_URL = process.env.GITINGEST_BASE_URL || 'https://gitingest.com';
const CACHE_TTL_MS = Number(process.env.GITINGEST_CACHE_TTL_MS) || 3_600_000; // 1h default
const cache = new TTLCache<GitIngestResult>(CACHE_TTL_MS);

// Prune stale entries every 10 minutes
setInterval(() => cache.prune(), 10 * 60 * 1000).unref();

export class GitIngestService {
  /**
   * Parse a GitHub URL and return owner + repo name.
   */
  static parseOwnerRepo(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!match) throw new Error(`Cannot parse GitHub URL: ${url}`);
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }

  /**
   * Very rough token estimate — approx 4 chars per token.
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Extract the file-tree section from a gitingest dump.
   * gitingest puts a "Directory structure:" block near the top.
   */
  private static extractFileTree(text: string): string {
    const marker = /directory structure[:\s]*/i;
    const idx = text.search(marker);
    if (idx === -1) return '';
    // Tree ends at the first "=" separator line or the "File contents" header
    const after = text.slice(idx);
    const end = after.search(/={10,}|file contents/i);
    return (end === -1 ? after : after.slice(0, end)).trim();
  }

  /**
   * Fetch a gitingest digest for the given GitHub repository URL.
   * Results are cached for CACHE_TTL_MS.
   */
  static async ingest(repositoryUrl: string): Promise<GitIngestResult> {
    const cacheKey = cache.key(repositoryUrl);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const { owner, repo } = GitIngestService.parseOwnerRepo(repositoryUrl);
    const targetUrl = `${BASE_URL}/${owner}/${repo}`;

    console.log(`[GitIngest] Fetching ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Valgent-Backend/1.0'
      },
      signal: AbortSignal.timeout(30_000)
    });

    if (!response.ok) {
      throw new Error(
        `GitIngest fetch failed for ${targetUrl}: HTTP ${response.status} ${response.statusText}`
      );
    }

    const digestText = await response.text();
    if (!digestText || digestText.trim().length < 100) {
      throw new Error(`GitIngest returned empty or too-short response for ${repositoryUrl}`);
    }

    const result: GitIngestResult = {
      ingest_id: `INGEST-${cacheKey}`,
      repository_url: repositoryUrl,
      digest_text: digestText,
      file_tree: GitIngestService.extractFileTree(digestText),
      estimated_tokens: GitIngestService.estimateTokens(digestText),
      fetched_at: new Date().toISOString()
    };

    cache.set(cacheKey, result);
    return result;
  }

  /**
   * Retrieve a previously cached ingest result by its ingest_id.
   */
  static getById(ingestId: string): GitIngestResult | null {
    // Scan cache — acceptable for small usage (hackathon scale)
    for (const key of Object.keys((cache as any).store ?? {})) {
      const entry = cache.get(key);
      if (entry && entry.ingest_id === ingestId) return entry;
    }
    return null;
  }

  /**
   * Return a truncated section of the digest most relevant to a specific claim.
   * Simple keyword-window approach — sufficient for System One input.
   */
  static extractRelevantSection(claim: string, digest: string, windowChars = 6000): string {
    const lower = digest.toLowerCase();
    const words = claim.toLowerCase().split(/\s+/).filter(w => w.length > 4);

    let bestIdx = 0;
    let bestScore = 0;

    for (let i = 0; i < lower.length - windowChars; i += 500) {
      const slice = lower.slice(i, i + windowChars);
      const score = words.reduce((s, w) => s + (slice.includes(w) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    return digest.slice(bestIdx, bestIdx + windowChars);
  }
}
