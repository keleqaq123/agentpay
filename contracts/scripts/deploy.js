const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

  const AgentPayEscrow = await hre.ethers.getContractFactory("AgentPayEscrow");
  const escrow = await AgentPayEscrow.deploy(USDC_ADDRESS);

  await escrow.waitForDeployment();

  console.log("AgentPayEscrow deployed to:", await escrow.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});