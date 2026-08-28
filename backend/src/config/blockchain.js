const { Web3 } = require('web3');
const abi = require('./CredentialRegistry.abi.json');
const { logger } = require('../utils/logger');

const NODE_URL = process.env.BLOCKCHAIN_NODE_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;

let web3 = null;
let contract = null;
let account = null;

async function connectBlockchain() {
  web3 = new Web3(NODE_URL);

  const chainId = await web3.eth.getChainId();
  logger.info(`Connected to blockchain node (chainId ${chainId})`);

  if (PRIVATE_KEY) {
    account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
  }

  if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
    contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);
  } else {
    logger.warn('CONTRACT_ADDRESS is not configured; on-chain calls are disabled');
  }

  return { web3, contract, account };
}

function getWeb3() {
  if (!web3) {
    throw new Error('Blockchain not connected. Call connectBlockchain() first.');
  }
  return web3;
}

function getContract() {
  if (!contract) {
    throw new Error('Contract not configured. Set CONTRACT_ADDRESS and reconnect.');
  }
  return contract;
}

function getAccount() {
  if (!account) {
    throw new Error('No blockchain account configured. Set BLOCKCHAIN_PRIVATE_KEY.');
  }
  return account;
}

module.exports = { connectBlockchain, getWeb3, getContract, getAccount, abi };
