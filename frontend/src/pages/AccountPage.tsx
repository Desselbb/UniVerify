import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { apiErrorMessage, authApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { MfaSetup } from '../api/types';

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await authApi.updateProfile({ fullName, email });
      await refreshUser();
      setNotice('Profile updated');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update profile'));
    }
  }

  async function handleStartMfa() {
    setError(null);
    setNotice(null);
    try {
      setSetup(await authApi.setupMFA());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start MFA setup'));
    }
  }

  async function handleConfirmMfa(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      setNotice(await authApi.verifyMFA(mfaToken));
      setSetup(null);
      setMfaToken('');
      await refreshUser();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not verify the code'));
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Account settings</Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile
        </Typography>
        <Stack component="form" spacing={2} onSubmit={handleProfileSubmit} sx={{ maxWidth: 420 }}>
          <TextField label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Box>
            <Button type="submit" variant="contained">
              Save changes
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Two-factor authentication</Typography>
          <Chip
            size="small"
            label={user?.mfaEnabled ? 'Enabled' : 'Disabled'}
            color={user?.mfaEnabled ? 'success' : 'default'}
          />
        </Stack>

        {!setup && (
          <Button variant="outlined" onClick={handleStartMfa}>
            {user?.mfaEnabled ? 'Reconfigure authenticator' : 'Set up authenticator'}
          </Button>
        )}

        {setup && (
          <Stack spacing={2} sx={{ maxWidth: 420 }}>
            <Typography variant="body2" color="text.secondary">
              Scan this code with your authenticator app, then enter the 6-digit code to finish.
            </Typography>
            <Box component="img" src={setup.qrCodeDataUrl} alt="MFA QR code" sx={{ width: 200 }} />
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              Secret: {setup.secret}
            </Typography>
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              Backup codes: {setup.backupCodes.join(', ')}
            </Typography>
            <Stack component="form" direction="row" spacing={2} onSubmit={handleConfirmMfa}>
              <TextField
                size="small"
                label="Authentication code"
                value={mfaToken}
                onChange={(event) => setMfaToken(event.target.value)}
                required
              />
              <Button type="submit" variant="contained">
                Enable
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
