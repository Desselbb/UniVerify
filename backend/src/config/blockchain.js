const { Web3 } = require('web3');
const abi = require('./CredentialRegistry.abi.json');
const { logger } = require('../utils/logger');

const NODE_URL = process.env.BLOCKCHAIN_NODE_URL || 'http://localhost:8545';
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

let web3 = null;
let contract = null;
let account = null;
let contractAddress = process.env.CONTRACT_ADDRESS;

async function connectBlockchain() {
  web3 = new Web3(NODE_URL);

  const chainId = await web3.eth.getChainId();
  logger.info(`Connected to blockchain node (chainId ${chainId})`);

  if (PRIVATE_KEY) {
    account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
  }

  if (contractAddress && contractAddress !== ZERO_ADDRESS) {
    contract = new web3.eth.Contract(abi, contractAddress);
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

function setContractAddress(address) {
  contractAddress = address;
  contract = new (getWeb3().eth.Contract)(abi, address);
  return contract;
}

function getContractAddress() {
  return contractAddress;
}

module.exports = {
  connectBlockchain,
  getWeb3,
  getContract,
  getAccount,
  setContractAddress,
  getContractAddress,
  abi
};
