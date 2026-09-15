import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { adminApi, apiErrorMessage } from '../../api/client';
import type { Role, User } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

type CreatableRole = Extract<Role, 'graduate' | 'university_admin' | 'verifier' | 'system_admin'>;

export default function UsersPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<CreatableRole>('university_admin');
  const [institutionId, setInstitutionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const isSystemAdmin = currentUser?.role === 'system_admin';

  useEffect(() => {
    adminApi
      .listUsers()
      .then(setUsers)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load users')))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreated(null);
    try {
      const user = await adminApi.createUser({
        fullName,
        email,
        password,
        role,
        institutionId: institutionId ? Number(institutionId) : undefined
      });
      setUsers((current) => [user, ...current]);
      setCreated(`${user.email} created as ${user.role.replace('_', ' ')}`);
      setFullName('');
      setEmail('');
      setPassword('');
      setInstitutionId('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create user'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Paper sx={{ p: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {created && <Alert severity="success">{created}</Alert>}
      <Typography variant="h6" gutterBottom>
        Create staff account
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Public sign-up only creates graduates; administrator accounts are created here.
      </Typography>
      <Stack component="form" direction={{ xs: 'column', md: 'row' }} spacing={2} onSubmit={handleCreate} sx={{ mb: 3 }}>
        <TextField
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
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
          label="Temporary password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          slotProps={{ htmlInput: { minLength: 8 } }}
          required
        />
        <TextField
          select
          label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value as CreatableRole)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="university_admin">University administrator</MenuItem>
          <MenuItem value="verifier">Verifier</MenuItem>
          <MenuItem value="graduate">Graduate</MenuItem>
          {isSystemAdmin && <MenuItem value="system_admin">System administrator</MenuItem>}
        </TextField>
        {isSystemAdmin && (
          <TextField
            label="Institution ID"
            value={institutionId}
            onChange={(event) => setInstitutionId(event.target.value)}
            sx={{ maxWidth: 160 }}
          />
        )}
        <Button type="submit" variant="contained" disabled={submitting}>
          Create
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>MFA</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.fullName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role.replace('_', ' ')}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={user.mfaEnabled ? 'Enabled' : 'Disabled'}
                  color={user.mfaEnabled ? 'success' : 'default'}
                />
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography color="text.secondary">No users yet.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
