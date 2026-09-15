/**
 * Decides the public verification outcome for a hash.
 *
 * The issuing database is the authoritative record: a hash that only exists on
 * chain is reported as not_found, so anchoring an arbitrary hash on the
 * registry cannot make it verify. The chain is used as corroboration and as an
 * independent revocation source.
 */
function resolveStatus({ credential, onChain, onChainInstitutionId = null }) {
  if (!credential) {
    return {
      status: 'not_found',
      anchor: {
        anchored: false,
        matches: false,
        unregisteredAnchor: Boolean(onChain?.exists)
      }
    };
  }

  const anchored = Boolean(onChain?.exists);
  const institutionMatches = !anchored
    || onChainInstitutionId == null
    || String(onChain.institutionId) === String(onChainInstitutionId);

  const revoked = Boolean(credential.isRevoked) || Boolean(onChain?.revoked);

  return {
    status: revoked ? 'revoked' : 'valid',
    anchor: {
      anchored,
      matches: anchored && institutionMatches,
      unregisteredAnchor: false,
      institutionMismatch: anchored && !institutionMatches
    }
  };
}

module.exports = { resolveStatus };
