import { Evidence } from '../shared/types';
import { LLMProvider, LLMAnalysisResult, LLMValidationResult } from './provider';

export class LLMRouter implements LLMProvider {
  public readonly name = 'router';
  private providers: LLMProvider[];
  public lastUsedProvider: string = 'none';

  constructor(providers: LLMProvider[]) {
    if (!providers || providers.length === 0) {
      throw new Error('LLMRouter requires at least one provider');
    }
    this.providers = providers;
  }

  public async analyzeEvidence(evidenceStore: Evidence[], graph?: any): Promise<LLMAnalysisResult> {
    let lastError: any;

    for (const provider of this.providers) {
      try {
        const result = await provider.analyzeEvidence(evidenceStore, graph);
        this.lastUsedProvider = provider.name;
        return result;
      } catch (error) {
        console.warn(`[LLMRouter] ${provider.name} analyzeEvidence failed:`, error);
        lastError = error;
      }
    }

    console.error(`[LLMRouter] All providers failed for analyzeEvidence. Last error:`, lastError);
    throw lastError;
  }

  public async validateClaims(packages: any[]): Promise<LLMValidationResult> {
    let lastError: any;

    for (const provider of this.providers) {
      try {
        const result = await provider.validateClaims(packages);
        this.lastUsedProvider = provider.name;
        return result;
      } catch (error) {
        console.warn(`[LLMRouter] ${provider.name} validateClaims failed:`, error);
        lastError = error;
      }
    }

    console.error(`[LLMRouter] All providers failed for validateClaims. Last error:`, lastError);
    throw lastError;
  }
}
