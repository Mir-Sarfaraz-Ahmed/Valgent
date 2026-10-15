import { GeminiProvider } from '../../src/llm/gemini';
import { GoogleGenAI } from '@google/genai';

jest.mock('@google/genai');

describe('GeminiProvider', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test_key';
    jest.clearAllMocks();
  });

  it('throws an error when API key is missing', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => new GeminiProvider()).toThrow('GEMINI_API_KEY environment variable is missing');
  });

  it('validates and parses valid Gemini JSON response', async () => {
    const mockGenerateContent = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        architecture: { components: [], entry_points: [], api_routes: [], databases: [] },
        features: ['test feature'],
        warnings: []
      })
    });

    (GoogleGenAI as jest.Mock).mockImplementation(() => {
      return { models: { generateContent: mockGenerateContent } };
    });

    const provider = new GeminiProvider();
    const result = await provider.analyzeEvidence([]);
    
    expect(result.features).toContain('test feature');
  });

  it('throws error on invalid schema from Gemini', async () => {
    const mockGenerateContent = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        architecture: { components: [] }, // Missing fields
        features: []
      })
    });

    (GoogleGenAI as jest.Mock).mockImplementation(() => {
      return { models: { generateContent: mockGenerateContent } };
    });

    const provider = new GeminiProvider();
    
    await expect(provider.analyzeEvidence([])).rejects.toThrow();
  });
});
