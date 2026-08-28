const { hashCredentialData, hashFileBuffer, isValidHash } = require('../src/services/hashService');

describe('hashService', () => {
  const credential = {
    studentName: 'Jane Graduate',
    studentId: 'S12345',
    degree: 'BSc Computer Science',
    graduationDate: '2024-06-30',
    institutionId: 1
  };

  it('produces a stable 0x-prefixed sha256 hash for credential data', () => {
    const hash = hashCredentialData(credential);
    expect(isValidHash(hash)).toBe(true);
    expect(hashCredentialData(credential)).toBe(hash);
  });

  it('ignores case and surrounding whitespace in credential fields', () => {
    expect(hashCredentialData({ ...credential, studentName: '  jane graduate ' }))
      .toBe(hashCredentialData(credential));
  });

  it('changes the hash when a field changes', () => {
    expect(hashCredentialData({ ...credential, degree: 'MSc Computer Science' }))
      .not.toBe(hashCredentialData(credential));
  });

  it('hashes file buffers', () => {
    expect(isValidHash(hashFileBuffer(Buffer.from('certificate')))).toBe(true);
  });

  it('rejects malformed hashes', () => {
    expect(isValidHash('0x123')).toBe(false);
    expect(isValidHash(undefined)).toBe(false);
  });
});
