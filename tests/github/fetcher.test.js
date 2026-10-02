"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest test for the fetcher
const fetcher_1 = require("../../src/github/fetcher");
describe('GithubFetcher', () => {
    it('validates correct GitHub URLs', () => {
        expect(fetcher_1.GithubFetcher.isValidUrl('https://github.com/owner/repository')).toBe(true);
        expect(fetcher_1.GithubFetcher.isValidUrl('https://github.com/facebook/react')).toBe(true);
    });
    it('rejects invalid GitHub URLs', () => {
        expect(fetcher_1.GithubFetcher.isValidUrl('https://github.com/')).toBe(false);
        expect(fetcher_1.GithubFetcher.isValidUrl('https://gitlab.com/owner/repository')).toBe(false);
        expect(fetcher_1.GithubFetcher.isValidUrl('owner/repository')).toBe(false);
    });
});
