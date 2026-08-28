import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the verification page', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /verify a credential/i })).toBeInTheDocument();
});
