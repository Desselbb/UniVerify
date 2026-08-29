import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import GraduatePage from './pages/GraduatePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyPage from './pages/VerifyPage';
import type { Role } from './api/types';

const theme = createTheme({ palette: { primary: { main: '#1b3a6b' } } });

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <CircularProgress />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<VerifyPage />} />
              <Route path="/verify/:hash" element={<VerifyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route
                path="/account"
                element={
                  <RequireRole roles={['graduate', 'university_admin', 'system_admin', 'verifier']}>
                    <AccountPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireRole roles={['university_admin', 'system_admin']}>
                    <AdminPage />
                  </RequireRole>
                }
              />
              <Route
                path="/graduate"
                element={
                  <RequireRole roles={['graduate', 'system_admin']}>
                    <GraduatePage />
                  </RequireRole>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
