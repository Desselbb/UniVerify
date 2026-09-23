import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { useAuth } from '../auth/AuthContext';

jest.mock('../auth/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../api/client', () => ({
  apiErrorMessage: (_error: unknown, fallback: string) => fallback
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const login = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: null,
    loading: false,
    login,
    register: jest.fn(),
    refreshUser: jest.fn(),
    logout: jest.fn()
  } as unknown as ReturnType<typeof useAuth>);
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

test('submits the typed credentials', async () => {
  const user = userEvent.setup();
  login.mockResolvedValue({ mfaRequired: false });

  renderLogin();
  await user.type(screen.getByLabelText(/email/i), 'admin@example.edu');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => expect(login).toHaveBeenCalledWith('admin@example.edu', 'password123', undefined));
});

test('asks for an authenticator code when MFA is required', async () => {
  const user = userEvent.setup();
  login.mockResolvedValue({ mfaRequired: true });

  renderLogin();
  await user.type(screen.getByLabelText(/email/i), 'mfa@example.edu');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByLabelText(/authentication code/i)).toBeInTheDocument();
});

test('shows an error and no token prompt when the credentials are rejected', async () => {
  const user = userEvent.setup();
  login.mockRejectedValue(new Error('401'));

  renderLogin();
  await user.type(screen.getByLabelText(/email/i), 'admin@example.edu');
  await user.type(screen.getByLabelText(/password/i), 'wrong');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/login failed/i);
  expect(screen.queryByLabelText(/authentication code/i)).not.toBeInTheDocument();
});
