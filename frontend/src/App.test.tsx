import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';


// Simple mock for lucide-react icons
vi.mock('lucide-react', () => ({
  ShieldCheck: () => <div data-testid="icon-shield-check" />,
  Shield: () => <div data-testid="icon-shield" />,
  GitBranch: () => <div data-testid="icon-git-branch" />,
  Cpu: () => <div data-testid="icon-cpu" />,
  CheckCircle: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Search: () => <div data-testid="icon-search" />,
  Code2: () => <div data-testid="icon-code2" />,
  GitMerge: () => <div data-testid="icon-git-merge" />,
  FileCheck2: () => <div data-testid="icon-file-check2" />,
  Zap: () => <div data-testid="icon-zap" />,
  ShieldAlert: () => <div data-testid="icon-shield-alert" />,
  BookOpenCheck: () => <div data-testid="icon-book-open" />,
  Blocks: () => <div data-testid="icon-blocks" />
}));

describe('App', () => {
  it('renders the Home page by default', () => {
    render(<App />);
    expect(screen.getByText('Understand the project. Verify the claims. Produce evidence-backed validation.')).not.toBeNull();
  });
});
