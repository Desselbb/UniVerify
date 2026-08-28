const crypto = require('crypto');

/**
 * Hash of the raw certificate bytes, used when a verifier uploads a file.
 */
function hashFileBuffer(buffer) {
  return `0x${crypto.createHash('sha256').update(buffer).digest('hex')}`;
}

/**
 * Deterministic hash of the canonical credential fields, used at issuance so
 * the same credential always maps to the same on-chain identifier.
 */
function hashCredentialData({ studentName, studentId, degree, graduationDate, institutionId }) {
  const canonical = [
    String(studentName).trim().toLowerCase(),
    String(studentId).trim().toLowerCase(),
    String(degree).trim().toLowerCase(),
    String(graduationDate).trim(),
    String(institutionId)
  ].join('|');

  return `0x${crypto.createHash('sha256').update(canonical).digest('hex')}`;
}

function isValidHash(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
}

module.exports = { hashFileBuffer, hashCredentialData, isValidHash };
