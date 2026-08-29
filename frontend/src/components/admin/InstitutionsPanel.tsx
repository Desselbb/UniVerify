import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Grid,
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
import { useAuth } from '../../auth/AuthContext';
import type { Institution } from '../../api/types';

const EMPTY_FORM = { name: '', registrationCode: '', contactEmail: '' };

export default function InstitutionsPanel() {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInstitutions(await adminApi.listInstitutions());
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load institutions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const institution = await adminApi.createInstitution({
        ...form,
        contactEmail: form.contactEmail || undefined
      });
      setNotice(`Institution created: ${institution.name}`);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create institution'));
    }
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      {user?.role === 'system_admin' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Register an institution
          </Typography>
          <Grid component="form" container spacing={2} onSubmit={handleCreate}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                required
                label="Name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                required
                label="Registration code"
                value={form.registrationCode}
                onChange={(event) => setForm((current) => ({ ...current, registrationCode: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="email"
                label="Contact email"
                value={form.contactEmail}
                onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
              />
            </Grid>
            <Grid size={12}>
              <Button type="submit" variant="contained">
                Create institution
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Registration code</TableCell>
                <TableCell>On chain</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {institutions.map((institution) => (
                <TableRow key={institution.id}>
                  <TableCell>{institution.name}</TableCell>
                  <TableCell>{institution.registrationCode}</TableCell>
                  <TableCell>{institution.onChainId ?? 'Not registered'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={institution.isActive ? 'Active' : 'Inactive'}
                      color={institution.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {institutions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography color="text.secondary">No institutions yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
