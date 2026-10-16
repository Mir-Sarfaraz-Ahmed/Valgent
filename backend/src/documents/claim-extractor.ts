import * as crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { DocClaim } from '../typesafe/comparator';

const EXTRACT_PROMPT = `You are a software documentation analyst.
Your task is to extract every distinct, verifiable SOFTWARE CLAIM from the provided document.

A software claim is a statement that asserts that the software:
- Has a specific feature or capability
- Implements a specific technology or pattern
- Satisfies a performance or security property
- Integrates with a specific third-party service

Rules:
- Extract ONLY factual claims about the software, NOT marketing language
- Each claim must be a complete, self-contained sentence
- Ignore vague statements like "easy to use" or "powerful platform"
- Return ONLY valid JSON in this exact format, with no extra text:

{
  "claims": [
    { "text": "claim text", "section": "section heading or empty string" }
  ]
}

Document:
`;

/**
 * Use Gemini 2.5 Flash to extract verifiable software claims from document text.
 */
export async function extractClaimsFromText(
  docId: string,
  docText: string
): Promise<DocClaim[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.gemeni_api || process.env.GEMINI_API;
  if (!apiKey) {
    console.warn('[ClaimExtractor] GEMINI_API_KEY not set — returning empty claims');
    return [];
  }

  // Truncate to ~60 000 chars to stay within context window
  const truncated = docText.slice(0, 60_000);

  const ai = new GoogleGenAI({ apiKey });

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents: EXTRACT_PROMPT + truncated,
      config: { responseMimeType: 'application/json' }
    });
  } catch (err: any) {
    console.error('[ClaimExtractor] Gemini call failed:', err?.message);
    return [];
  }

  if (!response.text) {
    console.warn('[ClaimExtractor] Gemini returned empty text');
    return [];
  }

  try {
    const parsed = JSON.parse(response.text) as {
      claims: Array<{ text: string; section?: string }>;
    };

    return (parsed.claims || []).map((c, idx) => ({
      claim_id: `CLAIM-${crypto.createHash('sha256')
        .update(`${docId}-${idx}-${c.text}`)
        .digest('hex')
        .substring(0, 8)
        .toUpperCase()}`,
      doc_id: docId,
      text: c.text,
      section: c.section ?? '',
      line_number: undefined,
    }));
  } catch (err) {
    console.error('[ClaimExtractor] Failed to parse Gemini JSON response:', err);
    return [];
  }
}
