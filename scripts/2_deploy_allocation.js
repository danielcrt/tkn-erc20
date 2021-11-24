// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const BN = ethers.BigNumber;

// General
const OWNER = process.env.DEPLOYER; // TODO: Fill in with owner address
const tokenAddress = '0x850EC3780CeDfdb116E38B009d0bf7a1ef1b8b38'; // TODO Fill in the token address
const decimals = 18;

// Development
const developmentWallet = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'; // TODO: Fill in development wallet
const developmentStart = new Date().getTime() + 30 * 24 * 60 * 60;
const developmentPeriod = 2 * 30 * 24 * 60 * 60; // 2 months
const developmentPeriods = 6;
const developmentTPP = BN.from(50000000).mul(BN.from(10).pow(decimals)); // Tokens released per vesting period
const developmentTokens = BN.from(300000000).mul(BN.from(10).pow(decimals));

// Partners and Advisors
const partnersAdvisorsWallet = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'; // TODO: Fill in partners wallet
const partnersAdvisorsStart = new Date().getTime() + 30 * 24 * 60 * 60;
const partnersAdvisorsPeriod = 3 * 30 * 24 * 60 * 60; // 2 months
const partnersAdvisorsPeriods = 6;
const partnersAdvisorsTPP = BN.from(8333333).mul(BN.from(10).pow(decimals)); // Tokens released per vesting period
const partnersAdvisorsTokens = BN.from(50000000).mul(BN.from(10).pow(decimals));

// Team
const teamWallet = '0x90f79bf6eb2c4f870365e785982e1f101e93b906'; // TODO: Fill in team wallet
const teamStart = new Date().getTime() + 30 * 24 * 60 * 60;
const teamPeriod = 54 * 24 * 60 * 60; // 54 days
const teamPeriods = 10;
const teamTPP = BN.from(15000000).mul(BN.from(10).pow(decimals)); // Tokens released per vesting period
const teamTokens = BN.from(150000000).mul(BN.from(10).pow(decimals));

// Rewards
const rewardsWallet = '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65'; // TODO: Fill in rewards wallet
const rewardsReleaseTime = new Date().getTime() + 180 * 24 * 60 * 60;
const rewardsTokens = BN.from(50000000).mul(BN.from(10).pow(decimals));

async function main() {
  const token = await ethers.getContractAt("TKNToken", tokenAddress);

  // Development
  const DevelopmentVesting = await ethers.getContractFactory("DevelopmentVesting");
  const developmentVesting = await DevelopmentVesting.deploy(
    OWNER,
    tokenAddress,
    developmentStart,
    developmentPeriod,
    developmentPeriods,
    developmentTPP
  );
  await developmentVesting.deployed();
  console.log("DevelopmentVesting deployed at: ", developmentVesting.address);

  await token.transfer(developmentVesting.address, developmentTokens);
  await developmentVesting.lockTokens(developmentWallet, developmentTokens);

  // Partners and advisors
  const PartnersAdvisorsVesting = await ethers.getContractFactory("PartnersAdvisorsVesting");
  const partnersAdvisorsVesting = await PartnersAdvisorsVesting.deploy(
    OWNER,
    tokenAddress,
    partnersAdvisorsStart,
    partnersAdvisorsPeriod,
    partnersAdvisorsPeriods,
    partnersAdvisorsTPP
  );
  await partnersAdvisorsVesting.deployed();
  console.log("PartnersAdvisorsVesting deployed at: ", partnersAdvisorsVesting.address);

  await token.transfer(partnersAdvisorsVesting.address, partnersAdvisorsTokens);
  await partnersAdvisorsVesting.lockTokens(partnersAdvisorsWallet, partnersAdvisorsTokens);

  // Team
  const TeamVesting = await ethers.getContractFactory("TeamVesting");
  const teamVesting = await TeamVesting.deploy(
    OWNER,
    tokenAddress,
    teamStart,
    teamPeriod,
    teamPeriods,
    teamTPP
  );
  await teamVesting.deployed();
  console.log("TeamVesting deployed at: ", teamVesting.address);

  await token.transfer(teamVesting.address, teamTokens);
  await teamVesting.lockTokens(teamWallet, teamTokens);

  // Rewards
  const RewardsTimelock = await ethers.getContractFactory("RewardsTimelock");
  const rewardsTimelock = await RewardsTimelock.deploy(
    tokenAddress,
    rewardsWallet,
    rewardsReleaseTime
  );
  await rewardsTimelock.deployed();
  console.log("RewardsTimelock deployed at: ", rewardsTimelock.address);
  await token.transfer(rewardsWallet, rewardsTokens);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
