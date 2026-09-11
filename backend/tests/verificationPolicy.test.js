const { resolveStatus } = require('../src/services/verificationPolicy');

describe('verification policy', () => {
  test('a credential in the issuing database with a matching anchor is valid', () => {
    const { status, anchor } = resolveStatus({
      credential: { isRevoked: false },
      onChain: { exists: true, revoked: false, institutionId: 1 },
      onChainInstitutionId: 1
    });

    expect(status).toBe('valid');
    expect(anchor).toMatchObject({ anchored: true, matches: true });
  });

  test('a hash anchored on chain but absent from the database is not found', () => {
    const { status, anchor } = resolveStatus({
      credential: null,
      onChain: { exists: true, revoked: false, institutionId: 99 }
    });

    expect(status).toBe('not_found');
    expect(anchor.unregisteredAnchor).toBe(true);
  });

  test('an unknown hash is not found', () => {
    const { status } = resolveStatus({ credential: null, onChain: { exists: false } });
    expect(status).toBe('not_found');
  });

  test('a credential stays valid when the chain is unreachable', () => {
    const { status, anchor } = resolveStatus({ credential: { isRevoked: false }, onChain: null });
    expect(status).toBe('valid');
    expect(anchor.anchored).toBe(false);
  });

  test('revocation in the database wins over an active anchor', () => {
    const { status } = resolveStatus({
      credential: { isRevoked: true },
      onChain: { exists: true, revoked: false, institutionId: 1 },
      onChainInstitutionId: 1
    });
    expect(status).toBe('revoked');
  });

  test('revocation on chain is honoured even when the database is stale', () => {
    const { status } = resolveStatus({
      credential: { isRevoked: false },
      onChain: { exists: true, revoked: true, institutionId: 1 },
      onChainInstitutionId: 1
    });
    expect(status).toBe('revoked');
  });

  test('an anchor issued under another institution is flagged as unmatched', () => {
    const { status, anchor } = resolveStatus({
      credential: { isRevoked: false },
      onChain: { exists: true, revoked: false, institutionId: 7 },
      onChainInstitutionId: 1
    });

    expect(status).toBe('valid');
    expect(anchor.matches).toBe(false);
    expect(anchor.institutionMismatch).toBe(true);
  });
});
