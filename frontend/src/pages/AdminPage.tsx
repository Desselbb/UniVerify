import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { adminApi, apiErrorMessage } from '../api/client';
import AuditLogPanel from '../components/admin/AuditLogPanel';
import InstitutionsPanel from '../components/admin/InstitutionsPanel';
import UsersPanel from '../components/admin/UsersPanel';
import type { Credential } from '../api/types';

type AdminTab = 'credentials' | 'institutions' | 'users' | 'audit';

const EMPTY_FORM = {
  studentName: '',
  studentId: '',
  degree: '',
  graduationDate: '',
  program: '',
  honors: ''
};

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('credentials');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (term?: string) => {
    setLoading(true);
    try {
      setCredentials(await adminApi.listCredentials(term));
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load credentials'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'credentials') {
      load();
    }
  }, [load, tab]);

  async function handleIssue(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const credential = await adminApi.issueCredential({
        ...form,
        program: form.program || undefined,
        honors: form.honors || undefined
      });
      setNotice(`Credential issued: ${credential.hash}`);
      setForm(EMPTY_FORM);
      await load(search || undefined);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not issue credential'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(credential: Credential) {
    const reason = window.prompt(`Reason for revoking ${credential.studentName}'s credential?`);
    if (!reason) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await adminApi.revokeCredential(credential.hash, reason);
      setNotice('Credential revoked');
      await load(search || undefined);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not revoke credential'));
    }
  }

  const field = (name: keyof typeof EMPTY_FORM, label: string, required = true, type = 'text') => (
    <TextField
      fullWidth
      required={required}
      type={type}
      label={label}
      value={form[name]}
      slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}
      onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
    />
  );

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Administration</Typography>

      <Tabs value={tab} onChange={(_event, value: AdminTab) => setTab(value)}>
        <Tab value="credentials" label="Credentials" />
        <Tab value="institutions" label="Institutions" />
        <Tab value="users" label="Users" />
        <Tab value="audit" label="Audit log" />
      </Tabs>

      {tab === 'institutions' && <InstitutionsPanel />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'audit' && <AuditLogPanel />}

      {tab !== 'credentials' ? null : (
        <>
          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Issue a credential
            </Typography>
            <Grid component="form" container spacing={2} onSubmit={handleIssue}>
              <Grid size={{ xs: 12, sm: 6 }}>{field('studentName', 'Student name')}</Grid>
              <Grid size={{ xs: 12, sm: 6 }}>{field('studentId', 'Student ID')}</Grid>
              <Grid size={{ xs: 12, sm: 6 }}>{field('degree', 'Degree')}</Grid>
              <Grid size={{ xs: 12, sm: 6 }}>{field('graduationDate', 'Graduation date', true, 'date')}</Grid>
              <Grid size={{ xs: 12, sm: 6 }}>{field('program', 'Program', false)}</Grid>
              <Grid size={{ xs: 12, sm: 6 }}>{field('honors', 'Honors', false)}</Grid>
              <Grid size={12}>
                <Button type="submit" variant="contained" disabled={submitting}>
                  Issue credential
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Search by name, student ID or hash"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button variant="outlined" onClick={() => load(search || undefined)}>
                Search
              </Button>
            </Stack>

            {loading ? (
              <CircularProgress />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Degree</TableCell>
                    <TableCell>Graduated</TableCell>
                    <TableCell>Anchored</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credentials.map((credential) => (
                    <TableRow key={credential.id}>
                      <TableCell>
                        {credential.studentName}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {credential.studentId}
                        </Typography>
                      </TableCell>
                      <TableCell>{credential.degree}</TableCell>
                      <TableCell>{credential.graduationDate}</TableCell>
                      <TableCell>{credential.blockchainTxHash ? 'On chain' : 'Off chain'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={credential.isRevoked ? 'Revoked' : 'Valid'}
                          color={credential.isRevoked ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" disabled={credential.isRevoked} onClick={() => handleRevoke(credential)}>
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {credentials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary">No credentials yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}
    </Stack>
  );
}
