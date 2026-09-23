import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';
import { useAuth } from '../auth/AuthContext';
import type { Role, User } from '../api/types';

jest.mock('../auth/AuthContext', () => ({
  useAuth: jest.fn()
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const logout = jest.fn();

function signedInAs(role: Role): User {
  return {
    id: 1,
    uuid: 'uuid',
    email: `${role}@example.edu`,
    fullName: 'Test Person',
    role,
    institutionId: 1,
    mfaEnabled: false
  };
}

function renderLayout(user: User | null) {
  mockedUseAuth.mockReturnValue({
    user,
    loading: false,
    login: jest.fn(),
    register: jest.fn(),
    refreshUser: jest.fn(),
    logout
  } as unknown as ReturnType<typeof useAuth>);

  return render(
    <MemoryRouter>
      <Layout>
        <div>page content</div>
      </Layout>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('signed-out visitors see the public bar and no sidebar sections', () => {
  renderLayout(null);

  expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
});

test('a university admin sees the administration section but not the graduate section', () => {
  renderLayout(signedInAs('university_admin'));

  expect(screen.getAllByText('Administration').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Credentials').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Audit log').length).toBeGreaterThan(0);
  expect(screen.queryByText('My credentials')).not.toBeInTheDocument();
});

test('a graduate sees only the graduate and account sections', () => {
  renderLayout(signedInAs('graduate'));

  expect(screen.getAllByText('My credentials').length).toBeGreaterThan(0);
  expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  expect(screen.queryByText('Users')).not.toBeInTheDocument();
});

test('a system admin sees both the graduate and administration sections', () => {
  renderLayout(signedInAs('system_admin'));

  expect(screen.getAllByText('My credentials').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Administration').length).toBeGreaterThan(0);
});

test('signing out from the sidebar clears the session', async () => {
  const user = userEvent.setup();
  renderLayout(signedInAs('graduate'));

  await user.click(screen.getAllByText('Sign out')[0]);

  expect(logout).toHaveBeenCalled();
});
