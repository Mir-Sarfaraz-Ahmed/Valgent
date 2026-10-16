import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';



describe('App', () => {
  it('renders the Home page by default', () => {
    render(<App />);
    expect(screen.getByText('Deterministic First.')).toBeDefined();
  });
});
