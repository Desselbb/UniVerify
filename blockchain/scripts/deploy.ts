import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const registry = await ethers.deployContract("CredentialRegistry");
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`CredentialRegistry deployed at: ${address}`);

  // The deployer is owner and registrar. When the backend signs with a different
  // key, grant it registrar rights so bootstrap can register institutions.
  const backendAddress = process.env.BACKEND_ADDRESS;
  if (backendAddress) {
    await (await registry.setRegistrar(backendAddress, true)).wait();
    console.log(`Authorized registrar: ${backendAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
