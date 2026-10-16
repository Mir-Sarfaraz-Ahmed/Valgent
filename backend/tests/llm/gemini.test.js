"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gemini_1 = require("../../src/llm/gemini");
const genai_1 = require("@google/genai");
jest.mock('@google/genai');
describe('GeminiAgent', () => {
    beforeEach(() => {
        process.env.GEMINI_API_KEY = 'test_key';
        jest.clearAllMocks();
    });
    it('throws an error when API key is missing', () => {
        delete process.env.GEMINI_API_KEY;
        expect(() => new gemini_1.GeminiAgent()).toThrow('GEMINI_API_KEY environment variable is missing');
    });
    it('validates and parses valid Gemini JSON response', async () => {
        const mockGenerateContent = jest.fn().mockResolvedValue({
            text: JSON.stringify({
                architecture: { components: [], entry_points: [], api_routes: [], databases: [] },
                features: ['test feature'],
                warnings: []
            })
        });
        genai_1.GoogleGenAI.mockImplementation(() => {
            return { models: { generateContent: mockGenerateContent } };
        });
        const agent = new gemini_1.GeminiAgent();
        const result = await agent.analyzeEvidence([]);
        expect(result.features).toContain('test feature');
    });
    it('throws error on invalid schema from Gemini', async () => {
        const mockGenerateContent = jest.fn().mockResolvedValue({
            text: JSON.stringify({
                architecture: { components: [] }, // Missing fields
                features: []
            })
        });
        genai_1.GoogleGenAI.mockImplementation(() => {
            return { models: { generateContent: mockGenerateContent } };
        });
        const agent = new gemini_1.GeminiAgent();
        await expect(agent.analyzeEvidence([])).rejects.toThrow();
    });
});
