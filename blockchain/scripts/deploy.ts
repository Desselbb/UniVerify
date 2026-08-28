import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const registry = await ethers.deployContract("CredentialRegistry");
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`CredentialRegistry deployed at: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
