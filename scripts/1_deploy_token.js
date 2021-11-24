// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

// Token info
const name = "TKN Token";
const symbol = "TKN";

async function main() {
  const TKNToken = await hre.ethers.getContractFactory("TKNToken");
  const token = await TKNToken.deploy();
  await token.deployed();
  await token.initialize(name, symbol);

  console.log("Token deployed at: ", token.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
