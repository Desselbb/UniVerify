import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../api/types';

const DRAWER_WIDTH = 240;

type NavItem = { label: string; to: string };
type NavSection = { heading?: string; items: NavItem[] };

function navSections(role?: Role): NavSection[] {
  const sections: NavSection[] = [{ items: [{ label: 'Verify a credential', to: '/' }] }];

  if (role === 'graduate' || role === 'system_admin') {
    sections.push({ heading: 'Graduate', items: [{ label: 'My credentials', to: '/graduate' }] });
  }

  if (role === 'university_admin' || role === 'system_admin') {
    sections.push({
      heading: 'Administration',
      items: [
        { label: 'Credentials', to: '/admin/credentials' },
        { label: 'Institutions', to: '/admin/institutions' },
        { label: 'Users', to: '/admin/users' },
        { label: 'Audit log', to: '/admin/audit' }
      ]
    });
  }

  sections.push({ heading: 'Account', items: [{ label: 'Account settings', to: '/account' }] });

  return sections;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <Box sx={{ overflow: 'auto' }}>
      {navSections(user?.role).map((section) => (
        <List
          key={section.heading ?? 'main'}
          dense
          subheader={section.heading ? <ListSubheader disableSticky>{section.heading}</ListSubheader> : undefined}
        >
          {section.items.map((item) => (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={location.pathname === item.to}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      ))}
      <Divider />
      <List dense>
        <ListItemButton
          onClick={() => {
            setMobileOpen(false);
            logout();
            navigate('/login');
          }}
        >
          <ListItemText primary="Sign out" secondary={user?.fullName} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {user && (
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Open menu"
              onClick={() => setMobileOpen((open) => !open)}
              sx={{ mr: 1, display: { sm: 'none' } }}
            >
              ☰
            </IconButton>
          )}
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            Uni-Verify
          </Typography>
          {!user && (
            <>
              <Button color="inherit" component={RouterLink} to="/">
                Verify
              </Button>
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

      <Box sx={{ display: 'flex' }}>
        {user && (
          <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', sm: 'none' },
                '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' }
              }}
            >
              <Toolbar />
              {nav}
            </Drawer>
            <Drawer
              variant="permanent"
              open
              sx={{
                display: { xs: 'none', sm: 'block' },
                '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' }
              }}
            >
              <Toolbar />
              {nav}
            </Drawer>
          </Box>
        )}

        <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
          <Toolbar />
          <Container maxWidth="md" sx={{ py: 4 }}>
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
