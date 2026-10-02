// Jest test for the fetcher
import { GithubFetcher } from '../../src/github/fetcher';

describe('GithubFetcher', () => {
  it('validates correct GitHub URLs', () => {
    expect(GithubFetcher.isValidUrl('https://github.com/owner/repository')).toBe(true);
    expect(GithubFetcher.isValidUrl('https://github.com/facebook/react')).toBe(true);
  });

  it('rejects invalid GitHub URLs', () => {
    expect(GithubFetcher.isValidUrl('https://github.com/')).toBe(false);
    expect(GithubFetcher.isValidUrl('https://gitlab.com/owner/repository')).toBe(false);
    expect(GithubFetcher.isValidUrl('owner/repository')).toBe(false);
  });
});
