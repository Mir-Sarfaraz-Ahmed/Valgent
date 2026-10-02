import { GoogleGenAI } from '@google/genai';
import { Evidence } from '../shared/types';
import { LLMProvider, LLMAnalysisResult, LLMValidationResult, LLMAnalysisSchema, LLMValidationSchema, ClaimValidationPackage } from './provider';

export class GeminiProvider implements LLMProvider {
  public readonly name = 'gemini';
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (!response.text) {
      throw new Error('Gemini returned empty response');
    }

    const parsed = JSON.parse(response.text);
    return LLMAnalysisSchema.parse(parsed);
  }

  public async validateClaims(packages: ClaimValidationPackage[]): Promise<LLMValidationResult> {
    const packagesJson = JSON.stringify(packages, null, 2);
    
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

Packages (Each contains the claim, bounded subgraph, and relevant evidence):
${packagesJson}
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (!response.text) {
      throw new Error('Gemini returned empty response');
    }

    const parsed = JSON.parse(response.text);
    return LLMValidationSchema.parse(parsed);
  }
}
