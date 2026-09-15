import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register({ fullName, email, password });
      navigate('/graduate');
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create a graduate account
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Staff accounts are created by your institution&apos;s administrator.
        </Typography>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            helperText="Graduates: use the name printed on your certificate"
            required
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            slotProps={{ htmlInput: { minLength: 8 } }}
            helperText="At least 8 characters"
            required
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" disabled={submitting}>
            Create account
          </Button>
          <Link component={RouterLink} to="/login" variant="body2">
            Already have an account? Sign in
          </Link>
        </Stack>
      </Paper>
    </Box>
  );
}
