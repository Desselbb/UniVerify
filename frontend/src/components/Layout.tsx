import React from 'react';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            Uni-Verify
          </Typography>
          <Button color="inherit" component={RouterLink} to="/">
            Verify
          </Button>
          {user?.role === 'graduate' && (
            <Button color="inherit" component={RouterLink} to="/graduate">
              My credentials
            </Button>
          )}
          {(user?.role === 'university_admin' || user?.role === 'system_admin') && (
            <Button color="inherit" component={RouterLink} to="/admin">
              Admin
            </Button>
          )}
          {user && (
            <Button color="inherit" component={RouterLink} to="/account">
              Account
            </Button>
          )}
          {user ? (
            <Button
              color="inherit"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Sign out ({user.fullName})
            </Button>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                Sign in
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
