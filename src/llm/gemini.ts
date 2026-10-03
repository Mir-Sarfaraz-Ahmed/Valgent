import { GoogleGenAI } from '@google/genai';
import { Evidence } from '../shared/types';
import { LLMProvider, LLMAnalysisResult, LLMValidationResult, LLMAnalysisSchema, LLMValidationSchema, ClaimValidationPackage } from './provider';

export class GeminiProvider implements LLMProvider {
  public readonly name = 'gemini';
  private ai: GoogleGenAI;

  private timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    this.timeoutMs = timeoutMs;
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  private createConfig(abortController: AbortController) {
    return {
      responseMimeType: "application/json",
      httpOptions: {
        fetch: async (url: RequestInfo | URL, opts: any) => {
          const response = await fetch(url, { ...opts, signal: abortController.signal });
          if (response.status === 429) {
            throw new Error('Gemini API 429: Too Many Requests (Quota/Rate Limit Exceeded)');
          }
          if (response.status >= 500) {
            throw new Error(`Gemini API ${response.status}: Provider Error`);
          }
          return response;
        }
      }
    };
  }

  public async analyzeEvidence(evidenceStore: Evidence[]): Promise<LLMAnalysisResult> {
    const evidenceJson = JSON.stringify(evidenceStore, null, 2);
    const prompt = `
You are Valgent, an AI-powered Build & Validation Agent.
Analyze the following evidence extracted deterministically from a software repository.

DO NOT invent any evidence, files, routes, dependencies, or tests.
DO NOT claim a feature exists solely because documentation says it exists without implementation evidence.
Your response MUST be ONLY valid JSON matching this schema:

{
  "architecture": {
    "components": ["list of major components found"],
    "entry_points": ["entry point file paths"],
    "api_routes": ["identified API routes"],
    "databases": ["database integrations found"]
  },
  "features": ["list of implemented features"],
  "warnings": ["any suspicious, conflicting, or missing evidence"]
}

Evidence:
${evidenceJson}
`;

    let response;
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

      response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: this.createConfig(abortController)
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }

    if (!response.text) {
      throw new Error('Gemini returned empty response');
    }

    const parsed = JSON.parse(response.text);
    return LLMAnalysisSchema.parse(parsed);
  }

  public async validateClaims(packages: ClaimValidationPackage[]): Promise<LLMValidationResult> {

    let packagesText = '';
    packages.forEach((pkg, i) => {
      packagesText += `\n==================================================\nPACKAGE ${i + 1}\n==================================================\n`;
      packagesText += `CLAIM_ID: ${pkg.claim.claim_id}\n`;
      packagesText += `CLAIM_TEXT: ${pkg.claim.text}\n\n`;

      packagesText += `AUTHORITATIVE EVIDENCE\n----------------------\n`;
      packagesText += JSON.stringify({ subgraph: pkg.subgraph, evidence: pkg.evidence }, null, 2) + '\n\n';

      if (pkg.context) {
        packagesText += `SUPPLEMENTAL REPOSITORY CONTEXT\n-------------------------------\n`;
        packagesText += `Supplemental repository context helps interpret implementation.\nIt is not itself an authoritative validation result.\n\n`;
        pkg.context.selectedFiles.forEach((file: any) => {
           packagesText += `File:\n${file.path}\n\n${file.content}\n\n`;
        });
      }
    });

    const prompt = `
You are Valgent, an AI-powered Build & Validation Agent.
Your task is to validate a list of builder claims against their deterministic evidence packages.

You MUST NOT fabricate evidence.
If there is no direct evidence supporting a claim, you MUST NOT mark it as VERIFIED.
Documentation alone is NOT implementation evidence.
Absence of evidence does NOT mean NOT_VERIFIED, it means INSUFFICIENT_EVIDENCE unless there's a contradiction.

For each claim, assign ONE of the following statuses:
- VERIFIED: Ample deterministic evidence (code + execution) completely supports the claim.
- PARTIALLY_VERIFIED: Some evidence exists, but the claim is broader than the evidence.
- NOT_VERIFIED: The evidence directly contradicts the claim.
- INSUFFICIENT_EVIDENCE: There is no relevant evidence to evaluate the claim.

Your response MUST be ONLY valid JSON matching this schema:
{
  "validations": [
    {
      "claim_id": "string",
      "text": "string",
      "status": "VERIFIED|PARTIALLY_VERIFIED|NOT_VERIFIED|INSUFFICIENT_EVIDENCE",
      "conclusion": "string explaining reasoning",
      "evidence_refs": ["array of evidence IDs supporting the conclusion"],
      "graph_refs": ["array of node/edge IDs from the graph"],
      "requirement_refs": ["array of requirements"],
      "checks": ["array of checks performed"],
      "limitations": ["array of limitations or caveats"],
      "missing_evidence": ["array of missing evidence pieces"]
    }
  ],
  "roadmap": [
    {
      "task_id": "string",
      "claim_id": "string",
      "requirement_id": "string",
      "title": "string",
      "problem": "string",
      "evidence_refs": ["evidence IDs highlighting the problem"],
      "recommended_actions": ["array of remediation steps"],
      "acceptance_criteria": ["array of completion criteria"]
    }
  ]
}

Packages (Each contains the claim, bounded subgraph, relevant evidence, and supplemental context):
${packagesText}
`;

    let response;
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

      response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: this.createConfig(abortController)
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }

    if (!response.text) {
      throw new Error('Gemini returned empty response');
    }

    const parsed = JSON.parse(response.text);
    return LLMValidationSchema.parse(parsed);
  }
}
