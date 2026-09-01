const {
  getWeb3,
  getAccount,
  getContractAddress,
  setContractAddress,
  abi
} = require('../config/blockchain');
const bytecode = require('../config/CredentialRegistry.bytecode.json');
const { Credential, Institution } = require('../models');
const { logger } = require('../utils/logger');
const blockchain = require('./blockchainService');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Deploys the registry when the configured address holds no code. Free hosting tiers
// run the chain on ephemeral storage, so the contract has to be recreated on boot.
async function ensureContract() {
  const web3 = getWeb3();
  const configured = getContractAddress();

  if (configured && configured !== ZERO_ADDRESS) {
    const code = await web3.eth.getCode(configured);
    if (code && code !== '0x') {
      return configured;
    }
  }

  const account = getAccount();
  const deployed = await new web3.eth.Contract(abi)
    .deploy({ data: bytecode.object })
    .send({ from: account.address, gas: 4000000, gasPrice: '0' });

  const address = deployed.options.address;
  setContractAddress(address);
  logger.info(`Deployed CredentialRegistry at ${address}`);
  return address;
}

async function ensureInstitution(institution) {
  if (institution.onChainId) {
    const onChain = await blockchain.getInstitution(institution.onChainId);
    if (onChain.isActive && onChain.registrationCode === institution.registrationCode) {
      return institution.onChainId;
    }
  }

  const onChainId = await blockchain.registerInstitution({
    name: institution.name,
    registrationCode: institution.registrationCode
  });

  await institution.update({ onChainId });
  return onChainId;
}

async function ensureCredential(credential, onChainId) {
  const state = await blockchain.verifyCredential(credential.hash);

  if (!state.exists) {
    const { txHash, blockNumber } = await blockchain.issueCredential({
      hash: credential.hash,
      institutionId: onChainId
    });
    await credential.update({ blockchainTxHash: txHash, blockNumber, blockTimestamp: new Date() });
  }

  if (credential.isRevoked && !(await blockchain.verifyCredential(credential.hash)).revoked) {
    await blockchain.revokeCredential(credential.hash, credential.revocationReason || 'Revoked');
  }
}

// Mirrors every stored institution and credential onto the chain the backend is
// pointed at, so verification keeps working after the chain is reset.
async function syncOnChainState() {
  const institutions = await Institution.findAll();

  for (const institution of institutions) {
    const onChainId = await ensureInstitution(institution);
    const credentials = await Credential.findAll({ where: { institutionId: institution.id } });

    if (credentials.length > 0) {
      await blockchain.authorizeIssuerFor(onChainId);
    }

    for (const credential of credentials) {
      await ensureCredential(credential, onChainId);
    }
  }

  logger.info('On-chain state synchronised');
}

async function needsBootstrap() {
  const address = getContractAddress();
  if (!address || address === ZERO_ADDRESS) {
    return true;
  }
  const code = await getWeb3().eth.getCode(address);
  return !code || code === '0x';
}

async function bootstrap() {
  await ensureContract();
  await syncOnChainState();
}

module.exports = { bootstrap, ensureContract, syncOnChainState, needsBootstrap };
