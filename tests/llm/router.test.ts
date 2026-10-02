import { LLMRouter } from '../../src/llm/router';
import { LLMProvider, LLMAnalysisResult, LLMValidationResult } from '../../src/llm/provider';

class MockProvider implements LLMProvider {
  public name: string;
  public analyzeEvidenceMock = jest.fn();
  public validateClaimsMock = jest.fn();

  constructor(name: string) {
    this.name = name;
  }

  async analyzeEvidence(evidenceStore: any[]): Promise<LLMAnalysisResult> {
    return this.analyzeEvidenceMock(evidenceStore);
  }

  async validateClaims(packages: any[]): Promise<LLMValidationResult> {
    return this.validateClaimsMock(packages);
  }
}

describe('LLMRouter', () => {
  let primaryProvider: MockProvider;
  let fallbackProvider: MockProvider;
  let router: LLMRouter;

  beforeEach(() => {
    primaryProvider = new MockProvider('primary');
    fallbackProvider = new MockProvider('fallback');
    router = new LLMRouter([primaryProvider, fallbackProvider]);
    jest.clearAllMocks();
  });

  it('returns result from primary provider if successful', async () => {
    const mockResult = { architecture: { components: [], entry_points: [], api_routes: [], databases: [] }, features: ['primary'], warnings: [] };
    primaryProvider.analyzeEvidenceMock.mockResolvedValue(mockResult);

    const result = await router.analyzeEvidence([]);
    
    expect(result.features).toContain('primary');
    expect(primaryProvider.analyzeEvidenceMock).toHaveBeenCalled();
    expect(fallbackProvider.analyzeEvidenceMock).not.toHaveBeenCalled();
    expect(router.lastUsedProvider).toBe('primary');
  });

  it('falls back to secondary provider if primary fails', async () => {
    primaryProvider.analyzeEvidenceMock.mockRejectedValue(new Error('Primary failed'));
    
    const mockResult = { architecture: { components: [], entry_points: [], api_routes: [], databases: [] }, features: ['fallback'], warnings: [] };
    fallbackProvider.analyzeEvidenceMock.mockResolvedValue(mockResult);

    const result = await router.analyzeEvidence([]);
    
    expect(result.features).toContain('fallback');
    expect(primaryProvider.analyzeEvidenceMock).toHaveBeenCalled();
    expect(fallbackProvider.analyzeEvidenceMock).toHaveBeenCalled();
    expect(router.lastUsedProvider).toBe('fallback');
  });

  it('throws error if all providers fail', async () => {
    primaryProvider.analyzeEvidenceMock.mockRejectedValue(new Error('Primary failed'));
    fallbackProvider.analyzeEvidenceMock.mockRejectedValue(new Error('Fallback failed'));

    await expect(router.analyzeEvidence([])).rejects.toThrow('Fallback failed');
    
    expect(primaryProvider.analyzeEvidenceMock).toHaveBeenCalled();
    expect(fallbackProvider.analyzeEvidenceMock).toHaveBeenCalled();
  });
});
