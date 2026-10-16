export interface ExtractedClaim {
  claim_id: string;
  text: string;
}

const IGNORE_WORDS = new Set([
  'purpose',
  'important',
  'repository',
  'branch',
  'branch/ref',
  'ref',
  'snapshot',
  'evidence',
  'note',
  'notes',
  'supported',
  'instruction',
  'instructions',
  'warning',
  'todo',
  'fixme',
]);

/**
 * Extracts structured claims (ID + text) from Markdown, JSON, YAML, or plain text.
 */
export function extractClaimsFromDocument(content: string, filename?: string): ExtractedClaim[] {
  if (!content || !content.trim()) return [];

  const trimmedContent = content.trim();

  // 1. JSON handling
  if (filename?.endsWith('.json') || (trimmedContent.startsWith('[') || trimmedContent.startsWith('{'))) {
    try {
      const parsed = JSON.parse(trimmedContent);
      const items = Array.isArray(parsed) ? parsed : (parsed.claims || parsed.requirements || []);
      if (Array.isArray(items) && items.length > 0) {
        const claims: ExtractedClaim[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (typeof item === 'string') {
            claims.push({ claim_id: `CLM-${String(i + 1).padStart(3, '0')}`, text: item.trim() });
          } else if (typeof item === 'object' && item !== null) {
            const id = item.claim_id || item.id || item.key || `CLM-${String(i + 1).padStart(3, '0')}`;
            const text = item.text || item.claim || item.requirement || item.description || item.title || '';
            if (text && text.trim().length > 3) {
              claims.push({ claim_id: String(id).trim(), text: String(text).trim() });
            }
          }
        }
        if (claims.length > 0) return claims;
      }
    } catch {
      // Fallback to text parsing
    }
  }

  // 2. Markdown / Plain Text parsing
  const claims: ExtractedClaim[] = [];
  const lines = trimmedContent.split(/\r?\n/);

  const boldIdPattern = /^\s*(?:[-*+]|\d+\.)?\s*\*\*([A-Za-z0-9_#-]+)\*\*\s*(?:[—–:-]|--)\s*(.+)$/;
  const bracketOrSimpleIdPattern = /^\s*(?:[-*+]|\d+\.)?\s*(?:\[|\()?([A-Za-z]{1,8}[-_]?[0-9]{1,5})(?:\]|\))?\s*(?:[—–:-]|--)\s*(.+)$/;
  const tableRowPattern = /^\s*\|\s*([A-Za-z0-9_#-]+)\s*\|\s*([^|]+)\s*\|/;

  let currentClaim: ExtractedClaim | null = null;
  let inClaimsSection = false;
  let genericCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      if (currentClaim) {
        claims.push(currentClaim);
        currentClaim = null;
      }
      continue;
    }

    if (line.startsWith('#')) {
      if (currentClaim) {
        claims.push(currentClaim);
        currentClaim = null;
      }
      const lowerHeader = line.toLowerCase();
      // Level 1 headers (# Title) are document titles, not claims sections
      if (/^#\s+[^#]/.test(line)) {
        inClaimsSection = false;
        continue;
      }
      if (
        lowerHeader.includes('repository under test') ||
        lowerHeader.includes('instructions') ||
        lowerHeader.includes('overview') ||
        lowerHeader.includes('setup') ||
        lowerHeader.includes('environment') ||
        lowerHeader.includes('metadata') ||
        lowerHeader.includes('context') ||
        lowerHeader.includes('purpose')
      ) {
        inClaimsSection = false;
      } else if (
        lowerHeader.includes('claim') ||
        lowerHeader.includes('requirement') ||
        lowerHeader.includes('specification')
      ) {
        inClaimsSection = true;
      }
      continue;
    }

    const boldMatch = line.match(boldIdPattern);
    if (boldMatch) {
      if (currentClaim) claims.push(currentClaim);
      const rawId = boldMatch[1].trim();
      const text = boldMatch[2].trim();
      const lowerRaw = rawId.toLowerCase();
      const isMetaText = /^(snapshot\s*inspected|evidence\s*to\s*inspect|repository|branch|commit|author|purpose|important)/i.test(text);
      if (!IGNORE_WORDS.has(lowerRaw) && !isMetaText && text.length > 5) {
        currentClaim = { claim_id: rawId, text };
        continue;
      }
    }

    const bracketMatch = line.match(bracketOrSimpleIdPattern);
    if (bracketMatch) {
      if (currentClaim) claims.push(currentClaim);
      const rawId = bracketMatch[1].trim();
      const text = bracketMatch[2].trim();
      const lowerRaw = rawId.toLowerCase();
      const isMetaText = /^(snapshot\s*inspected|evidence\s*to\s*inspect|repository|branch|commit|author|purpose|important)/i.test(text);
      if (!IGNORE_WORDS.has(lowerRaw) && !isMetaText && text.length > 5) {
        currentClaim = { claim_id: rawId, text };
        continue;
      }
    }

    const tableMatch = line.match(tableRowPattern);
    if (tableMatch && !line.includes('---')) {
      const rawId = tableMatch[1].trim();
      const text = tableMatch[2].trim();
      if (!['id', 'claim', 'requirement', 'status'].includes(rawId.toLowerCase()) && text.length > 5) {
        if (currentClaim) claims.push(currentClaim);
        currentClaim = { claim_id: rawId, text };
        continue;
      }
    }

    if (currentClaim) {
      if (!line.startsWith('-') && !line.startsWith('*') && !line.startsWith('#') && !line.startsWith('|')) {
        currentClaim.text += ' ' + line;
        continue;
      } else {
        claims.push(currentClaim);
        currentClaim = null;
      }
    }

    if (inClaimsSection && (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s+/.test(line))) {
      const stripped = line.replace(/^(?:[-*+]|\d+\.)\s+/, '').trim();
      const isMeta = /^(snapshot\s*inspected|evidence\s*to\s*inspect|repository|branch|commit|author|prerequisites|how\s*to|notes?|test\s*environment|purpose|important|overview)/i.test(stripped);
      if (!isMeta && stripped.length > 10) {
        claims.push({
          claim_id: `CLM-${String(genericCounter++).padStart(3, '0')}`,
          text: stripped,
        });
      }
    }
  }

  if (currentClaim) {
    claims.push(currentClaim);
  }

  return claims;
}
