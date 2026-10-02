import { OpenRouterProvider } from '../../src/llm/openrouter';

describe('OpenRouterProvider', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test_openrouter_key';
    jest.clearAllMocks();
  });

  it('throws an error when API key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = new OpenRouterProvider();
    await expect(provider.analyzeEvidence([])).rejects.toThrow('OPENROUTER_API_KEY is missing');
  });

  it('validates and parses valid OpenRouter JSON response', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                architecture: { components: [], entry_points: [], api_routes: [], databases: [] },
                features: ['openrouter feature'],
                warnings: []
              })
            }
          }
        ]
      })
    });
    global.fetch = mockFetch;

    const provider = new OpenRouterProvider();
    const result = await provider.analyzeEvidence([]);
    
    expect(result.features).toContain('openrouter feature');
    
    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Authorization": "Bearer test_openrouter_key",
          "Content-Type": "application/json"
        },
        body: expect.stringContaining('"model":"openrouter/free"')
      })
    );
  });

  it('throws error on malformed response from OpenRouter', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                architecture: { components: [] }, // Missing fields
                features: []
              })
            }
          }
        ]
      })
    });
    global.fetch = mockFetch;

    const provider = new OpenRouterProvider();
    
    await expect(provider.analyzeEvidence([])).rejects.toThrow();
  });
});
