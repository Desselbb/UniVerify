import React from 'react';
import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { verifyApi } from '../api/client';
import type { VerificationResult, VerificationStatus } from '../api/types';

const STATUS_LABEL: Record<VerificationStatus, { label: string; color: 'success' | 'error' | 'warning' }> = {
  valid: { label: 'Valid', color: 'success' },
  revoked: { label: 'Revoked', color: 'warning' },
  not_found: { label: 'Not found', color: 'error' }
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function VerificationResultCard({ result }: { result: VerificationResult }) {
  const status = STATUS_LABEL[result.status];

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <Chip label={status.label} color={status.color} />
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {result.hash}
          </Typography>
        </Stack>

        {result.credential ? (
          <Stack spacing={1.5}>
            <Field label="Student" value={result.credential.studentName} />
            <Field label="Degree" value={result.credential.degree} />
            <Field label="Program" value={result.credential.program} />
            <Field label="Honors" value={result.credential.honors} />
            <Field label="Graduation date" value={result.credential.graduationDate} />
            <Field label="Institution" value={result.credential.institution} />
            <Field label="Revocation reason" value={result.credential.revocationReason} />
            <Field label="Transaction" value={result.credential.blockchainTxHash} />
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No credential matches this hash.
          </Typography>
        )}

        {result.onChain?.exists && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              On-chain record
            </Typography>
            <Stack spacing={1.5}>
              <Field label="Issuer" value={result.onChain.issuer} />
              <Field label="Institution id" value={result.onChain.institutionId} />
              <Field label="Issued at" value={new Date(result.onChain.issuedAt * 1000).toUTCString()} />
              <Field label="Revoked on chain" value={result.onChain.revoked ? 'Yes' : 'No'} />
            </Stack>
          </>
        )}

        {result.status !== 'not_found' && (
          <Button
            sx={{ mt: 3 }}
            variant="outlined"
            href={verifyApi.certificateUrl(result.hash)}
            target="_blank"
            rel="noopener"
          >
            Download verification report
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
