import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { apiErrorMessage, verifyApi } from '../api/client';
import type { BulkVerificationResult, VerificationResult } from '../api/types';
import VerificationResultCard from '../components/VerificationResultCard';

export default function VerifyPage() {
  const { hash: hashParam } = useParams();
  const navigate = useNavigate();
  const [hash, setHash] = useState(hashParam ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<(VerificationResult | BulkVerificationResult)[]>([]);

  const run = useCallback(async (action: () => Promise<(VerificationResult | BulkVerificationResult)[]>) => {
    setLoading(true);
    setError(null);
    try {
      setResults(await action());
    } catch (err) {
      setResults([]);
      setError(apiErrorMessage(err, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hashParam) {
      setHash(hashParam);
      run(async () => [await verifyApi.byHash(hashParam)]);
    }
  }, [hashParam, run]);

  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return;
      }
      run(async () =>
        files.length === 1 ? [await verifyApi.byFile(files[0])] : await verifyApi.bulk(files.slice(0, 10))
      );
    },
    [run]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    maxFiles: 10
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Verify a credential
        </Typography>
        <Typography color="text.secondary">
          Check a certificate against the blockchain registry by hash or by uploading the document.
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack
          component="form"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          onSubmit={(event) => {
            event.preventDefault();
            navigate(`/verify/${hash.trim()}`);
          }}
        >
          <TextField
            fullWidth
            label="Credential hash"
            placeholder="0x…"
            value={hash}
            onChange={(event) => setHash(event.target.value)}
          />
          <Button type="submit" variant="contained" disabled={!hash.trim() || loading}>
            Verify
          </Button>
        </Stack>
      </Paper>

      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          cursor: 'pointer'
        }}
      >
        <input {...getInputProps()} />
        <Typography>
          {isDragActive
            ? 'Drop the certificates here…'
            : 'Drag certificates here, or click to select (PDF, PNG, JPG — up to 10 files)'}
        </Typography>
      </Paper>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {results.map((result) => (
        <Stack key={`${result.hash}-${(result as BulkVerificationResult).fileName ?? ''}`} spacing={1}>
          {(result as BulkVerificationResult).fileName && (
            <Typography variant="subtitle2">{(result as BulkVerificationResult).fileName}</Typography>
          )}
          <VerificationResultCard result={result} />
        </Stack>
      ))}
    </Stack>
  );
}
