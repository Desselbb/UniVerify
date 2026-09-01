const { getContract, getAccount, getWeb3 } = require('../config/blockchain');

const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;

function toBytes32(value) {
  if (!value) {
    return ZERO_BYTES32;
  }
  const hex = getWeb3().utils.utf8ToHex(value).slice(2, 66);
  return `0x${hex.padEnd(64, '0')}`;
}

// Registers the institution on-chain (admin = backend account) and authorizes the
// backend account as an issuer for it. Returns the on-chain institution id.
async function registerInstitution({ name, registrationCode }) {
  const contract = getContract();
  const account = getAccount();

  const receipt = await contract.methods
    .registerInstitution(name, registrationCode, account.address)
    .send({ from: account.address, gas: 500000, gasPrice: '0' });

  const onChainId = Number(receipt.events.InstitutionRegistered.returnValues.id);

  await contract.methods
    .authorizeIssuer(account.address, onChainId)
    .send({ from: account.address, gas: 300000, gasPrice: '0' });

  return onChainId;
}

async function issueCredential({ hash, institutionId, metadataUri = '' }) {
  const contract = getContract();
  const account = getAccount();

  const metadataBytes = toBytes32(metadataUri);

  const receipt = await contract.methods
    .issueCredential(hash, institutionId, metadataBytes)
    .send({ from: account.address, gas: 500000, gasPrice: '0' });

  return {
    txHash: receipt.transactionHash,
    blockNumber: Number(receipt.blockNumber)
  };
}

async function getInstitution(onChainId) {
  const result = await getContract().methods.institutions(onChainId).call();

  return {
    name: result.name,
    registrationCode: result.registrationCode,
    admin: result.admin,
    isActive: Boolean(result.isActive)
  };
}

// The contract binds an issuer to a single institution, so the backend account has to be
// re-pointed before issuing for a different one.
async function authorizeIssuerFor(onChainId) {
  const contract = getContract();
  const account = getAccount();

  await contract.methods
    .authorizeIssuer(account.address, onChainId)
    .send({ from: account.address, gas: 300000, gasPrice: '0' });
}

async function verifyCredential(hash) {
  const contract = getContract();
  const result = await contract.methods.verifyCredential(hash).call();

  return {
    exists: Boolean(result.exists),
    revoked: Boolean(result.revoked),
    issuedAt: Number(result.issuedAt),
    institutionId: Number(result.institutionId),
    metadataURI: result.metadataURI,
    issuer: result.issuer
  };
}

async function revokeCredential(hash, reason) {
  const contract = getContract();
  const account = getAccount();

  const receipt = await contract.methods
    .revokeCredential(hash, reason)
    .send({ from: account.address, gas: 300000, gasPrice: '0' });

  return { txHash: receipt.transactionHash, blockNumber: Number(receipt.blockNumber) };
}

module.exports = {
  registerInstitution,
  issueCredential,
  verifyCredential,
  revokeCredential,
  getInstitution,
  authorizeIssuerFor
};
