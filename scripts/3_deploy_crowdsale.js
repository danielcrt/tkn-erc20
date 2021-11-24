// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = hre;
const BN = ethers.BigNumber;
const { ethUsdAggregator } = require("./utils");

// Token info
const tokenAddress = "0x850EC3780CeDfdb116E38B009d0bf7a1ef1b8b38"; // TODO: fill in the token address from 1_deploy_token.js
const decimals = 18;

// General
// This is the wallet address used for the vault
const vaultWallet = "0xbda5747bfd65f08deb54cb465eb87d40e51b197e"; // TODO: Replace with a valid adddress
const OWNER = process.env.DEPLOYER; // TODO: Replace with the owner address

// Crowdsale details
const softCap = BN.from(32000000).mul(BN.from(10).pow(decimals));
const hardCap = BN.from(80000000).mul(BN.from(10).pow(decimals));
const initialRate = 250; // Token / 1 USD rate
// TODO: Update the start date and time of the crowdsale.  
const startTime = new Date().getTime();
// TODO: Update the time when vesting will start (e.g. 30 days from crowdsale start)
const vestingStart = startTime + 30 * 24 * 3600;
const vestingPeriod = 3 * 30 * 24 * 3600; // An amount of tokens are released each 3 months
const vestingPeriods = 4; // Defines hwo many vesting periods are
const tokensPerPeriod = BN.from(18000000).mul(BN.from(10).pow(decimals)); // Tokens released per vesting period

async function main() {
  const chainId = hre.network.config.chainId;

  ethUsdAggregator[chainId] = "0x13093e4a28B977AafD892538dC06573857E1cBBb";
  if (!ethUsdAggregator.hasOwnProperty(chainId)) {
    throw 'No ETH/USD oracle for this chain id';
  }

  const token = await ethers.getContractAt("TKNToken", tokenAddress);

  const RefundVault = await ethers.getContractFactory("RefundVault");
  const vault = await RefundVault.deploy(vaultWallet);
  await vault.deployed();
  console.log("Refund vault deployed at: ", vault.address);

  const TKNCrowdsale = await ethers.getContractFactory("TKNCrowdsale");
  const crowdsale = await TKNCrowdsale.deploy();
  await crowdsale.deployed();
  console.log("Crowdsale deployed at: ", crowdsale.address);

  await crowdsale.__TKNCrowdsale_init(
    softCap,
    hardCap,
    initialRate,
    OWNER,
    vault.address,
    tokenAddress,
    ethUsdAggregator[chainId],
    vestingStart,
    vestingPeriod,
    vestingPeriods,
    tokensPerPeriod
  );
  console.log("PrivateSellVesting deployed at: ", await crowdsale.privateSellVesting());

  // Transfer ownership to crowdsale
  await token.transferOwnership(crowdsale.address);
  await vault.transferOwnership(crowdsale.address);

  await token.transfer(crowdsale.address, hardCap);

  await crowdsale.updateStartTime(startTime);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
