import React from 'react';
import { render, screen } from '@testing-library/react';
import VerificationResultCard from './VerificationResultCard';
import type { VerificationResult } from '../api/types';

const credential = {
  studentName: 'Mary Simalimbu',
  degree: 'BSc Accounting and Finance',
  program: 'Accounting',
  honors: 'Merit',
  graduationDate: '2024-06-30',
  institution: 'Integration University',
  issuedAt: '2024-07-01T00:00:00.000Z',
  revokedAt: null,
  revocationReason: null,
  blockchainTxHash: '0xtx'
};

const onChain = {
  exists: true,
  revoked: false,
  issuedAt: 1719705600,
  institutionId: 1,
  metadataURI: '',
  issuer: '0xIssuer'
};

function renderCard(result: VerificationResult) {
  return render(<VerificationResultCard result={result} />);
}

test('a valid result shows the credential details and the on-chain record', () => {
  renderCard({ hash: '0xabc', status: 'valid', onChain, credential });

  expect(screen.getByText('Valid')).toBeInTheDocument();
  expect(screen.getByText('Mary Simalimbu')).toBeInTheDocument();
  expect(screen.getByText('BSc Accounting and Finance')).toBeInTheDocument();
  expect(screen.getByText('On-chain record')).toBeInTheDocument();
  expect(screen.getByText('0xIssuer')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /download verification report/i })).toBeInTheDocument();
});

test('a revoked result shows the revocation reason', () => {
  renderCard({
    hash: '0xabc',
    status: 'revoked',
    onChain: { ...onChain, revoked: true },
    credential: { ...credential, revokedAt: '2024-08-01', revocationReason: 'Award rescinded' }
  });

  expect(screen.getByText('Revoked')).toBeInTheDocument();
  expect(screen.getByText('Award rescinded')).toBeInTheDocument();
  expect(screen.getByText('Yes')).toBeInTheDocument();
});

test('a not-found result hides credential fields and the report download', () => {
  renderCard({ hash: '0xdead', status: 'not_found', onChain: null, credential: null });

  expect(screen.getByText('Not found')).toBeInTheDocument();
  expect(screen.getByText('No credential matches this hash.')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /download verification report/i })).not.toBeInTheDocument();
});

test('empty optional fields are omitted rather than rendered blank', () => {
  renderCard({
    hash: '0xabc',
    status: 'valid',
    onChain: null,
    credential: { ...credential, program: null, honors: null, blockchainTxHash: null }
  });

  expect(screen.queryByText('Program')).not.toBeInTheDocument();
  expect(screen.queryByText('Honors')).not.toBeInTheDocument();
  expect(screen.queryByText('On-chain record')).not.toBeInTheDocument();
});
