import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography
} from '@mui/material';
import { apiErrorMessage, graduateApi } from '../api/client';
import type { Credential, ShareLink } from '../api/types';

export default function GraduatePage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<ShareLink | null>(null);

  useEffect(() => {
    graduateApi
      .listCredentials()
      .then(setCredentials)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load credentials')))
      .finally(() => setLoading(false));
  }, []);

  async function openShare(hash: string) {
    setError(null);
    try {
      setShare(await graduateApi.shareLink(hash));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create share link'));
    }
  }

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">My credentials</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {credentials.length === 0 && <Typography color="text.secondary">No credentials issued to you yet.</Typography>}

      {credentials.map((credential) => (
        <Card key={credential.id} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">{credential.degree}</Typography>
                <Typography color="text.secondary">
                  {credential.institution?.name ?? 'Institution'} — {credential.graduationDate}
                </Typography>
                <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                  {credential.hash}
                </Typography>
              </Box>
              <Stack spacing={1} sx={{ alignItems: 'flex-end' }}>
                <Chip
                  size="small"
                  label={credential.isRevoked ? 'Revoked' : 'Valid'}
                  color={credential.isRevoked ? 'warning' : 'success'}
                />
                <Button size="small" variant="outlined" onClick={() => openShare(credential.hash)}>
                  Share
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Dialog open={Boolean(share)} onClose={() => setShare(null)}>
        <DialogTitle>Share credential</DialogTitle>
        <DialogContent>
          {share && (
            <Stack spacing={2} sx={{ pb: 2, alignItems: 'center' }}>
              <img src={share.qrCodeDataUrl} alt="Verification QR code" width={220} height={220} />
              <Link href={share.url} target="_blank" rel="noopener" sx={{ wordBreak: 'break-all' }}>
                {share.url}
              </Link>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
