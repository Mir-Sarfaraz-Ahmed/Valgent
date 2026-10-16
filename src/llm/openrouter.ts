import { Evidence } from '../shared/types';
import { LLMProvider, LLMAnalysisResult, LLMValidationResult, LLMAnalysisSchema, LLMValidationSchema, ClaimValidationPackage } from './provider';

export class OpenRouterProvider implements LLMProvider {
  public readonly name = 'openrouter';
  private timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    this.timeoutMs = timeoutMs;
  }

  public async analyzeEvidence(evidenceStore: Evidence[]): Promise<LLMAnalysisResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is missing');

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

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    let response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
        signal: abortController.signal
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`OpenRouter request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }

    if (!response.ok) throw new Error(`OpenRouter failed with status ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter returned empty response');

    const parsed = JSON.parse(text);
    return LLMAnalysisSchema.parse(parsed);
  }

  public async validateClaims(packages: ClaimValidationPackage[]): Promise<LLMValidationResult> {
    if (packages.length === 0) {
      return { validations: [], roadmap: [] };
    }

    if (packages.length > 10) {
      const batchSize = 10;
      const allValidations: any[] = [];
      const allRoadmap: any[] = [];

      for (let i = 0; i < packages.length; i += batchSize) {
        const batch = packages.slice(i, i + batchSize);
        try {
          const batchResult = await this.validateClaimsSingleBatch(batch);
          allValidations.push(...batchResult.validations);
          allRoadmap.push(...batchResult.roadmap);
        } catch (batchErr) {
          console.warn(`[OpenRouterProvider] Batch ${Math.floor(i / batchSize) + 1} validation failed:`, batchErr);
        }
      }

      if (allValidations.length > 0) {
        return { validations: allValidations, roadmap: allRoadmap };
      }
    }

    return this.validateClaimsSingleBatch(packages);
  }

  private async validateClaimsSingleBatch(packages: ClaimValidationPackage[]): Promise<LLMValidationResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is missing');

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

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    let response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
        signal: abortController.signal
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`OpenRouter request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }

    if (!response.ok) throw new Error(`OpenRouter failed with status ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter returned empty response');

    const parsed = JSON.parse(text);
    return LLMValidationSchema.parse(parsed);
  }
}
