const { expect } = require("chai");
const { ethers } = require("hardhat");
const BN = ethers.BigNumber;
const { increaseTimeTo, duration } = require("./helpers/increaseTime");
const { latestTime } = require("./helpers/latestTime");
const { ether } = require("./helpers/ether");

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bn')(BN))
  .should();

const { CrowdsaleStage, StageRate, ethUsdAggregator } = require("./helpers/utils");

describe("PrivateSellVesting", function () {

  let accounts;
  let owner, vaultWallet, buyer1, buyer2, buyer3, buyer4;

  // TKN Token Info
  let name = "TKN Token";
  let symbol = "TKN";
  let softCap = ether('32000000');
  let crowdsaleTokens = ether('80000000');
  let crowdsaleStartTime;
  let rate = StageRate[CrowdsaleStage.STAGE_1];
  let vault;
  let chainId;
  let minInvestment = ether('0.001');
  let maxInvestment = ether('20');
  let privateSellVesting;
  let vestingStart;
  const vestingPeriod = 3 * duration.weeks(30);
  const vestingPeriods = 4;

  beforeEach(async () => {
    ({ chainId: chainId } = await ethers.provider.getNetwork());

    accounts = await ethers.getSigners();
    [owner, vaultWallet, buyer1, buyer2, buyer3, buyer4] = accounts;

    const ETHUSDOracle = await ethers.getContractFactory("ETHUSDOracle");
    ethUsdOracle = await ETHUSDOracle.deploy();
    await ethUsdOracle.deployed();
    ethUsdAggregator[chainId] = ethUsdOracle.address;

    const TKNToken = await ethers.getContractFactory("TKNToken");
    token = await TKNToken.deploy();
    await token.deployed();
    await token.initialize(name, symbol);

    const RefundVault = await ethers.getContractFactory("RefundVault");
    vault = await RefundVault.deploy(vaultWallet.address);
    await vault.deployed();

    crowdsaleStartTime = await latestTime() + duration.weeks(1);
    const TKNCrowdsale = await ethers.getContractFactory("TKNCrowdsale");

    vestingStart = await latestTime() + duration.days(30);
    crowdsale = await TKNCrowdsale.deploy();
    await crowdsale.deployed();
    // Inititize
    await crowdsale.__TKNCrowdsale_init(softCap,
      crowdsaleTokens,
      rate,
      owner.address,
      vault.address,
      token.address,
      ethUsdAggregator[chainId],
      vestingStart,
      vestingPeriod,
      vestingPeriods,
      ether('18000000')
    );

    privateSellVesting = await ethers.getContractAt("PrivateSellVesting", crowdsale.privateSellVesting());

    // Transfer ownership to crowdsale
    await token.transferOwnership(crowdsale.address);
    await vault.transferOwnership(crowdsale.address);

    await token.connect(owner).transfer(crowdsale.address, crowdsaleTokens);

    await crowdsale.updateStartTime(crowdsaleStartTime);

    await increaseTimeTo(crowdsaleStartTime + 1);
  });

  it("Vesting start time can be set only by owner", async function () {
    const newVestingStart = await latestTime() + duration.weeks(1);
    await expect(privateSellVesting.connect(buyer1).updateStart(newVestingStart)).to.be.rejected;
    await expect(privateSellVesting.connect(owner).updateStart(newVestingStart)).to.be.fulfilled;
  });

  it("Can release tokens only if vesting elapsed", async function () {
    const weiValue = minInvestment;
    await crowdsale.connect(buyer1).buyTokens({ value: weiValue });
    await crowdsale.connect(buyer1).buyTokens({ value: weiValue });

    await expect(privateSellVesting.connect(buyer1).release(buyer1.address)).to.be.rejected;

    await increaseTimeTo(vestingStart + vestingPeriod + 1);

    await expect(privateSellVesting.connect(buyer1).release(buyer1.address)).to.be.fulfilled;
  });

  it("Cannot unlock tokens if not enough in this stage", async function () {
    const weiValue = minInvestment;
    await crowdsale.connect(buyer1).buyTokens({ value: weiValue });
    await crowdsale.connect(buyer2).buyTokens({ value: weiValue });
    const tokensToBuy = await crowdsale.getRateWei(weiValue);

    await increaseTimeTo(vestingStart + vestingPeriod + 1);

    await expect(privateSellVesting.connect(buyer1).release(buyer1.address)).to.be.fulfilled;
    expect(await token.balanceOf(buyer1.address)).to.equal(tokensToBuy);
    await expect(privateSellVesting.connect(buyer1).release(buyer1.address)).to.be.rejected;
    await expect(privateSellVesting.connect(buyer2).release(buyer2.address)).to.be.fulfilled;
    await expect(privateSellVesting.connect(buyer2).release(buyer2.address)).to.be.rejected;
  });

  it("Can unlock tokens in different stages", async function () {
    const weiValue = maxInvestment;

    await crowdsale.connect(owner).setCrowdsaleStage(CrowdsaleStage.STAGE_6);
    await crowdsale.connect(buyer1).buyTokens({ value: weiValue });
    const tokensBoughtBuyer1 = await crowdsale.getRateWei(weiValue);
    await crowdsale.connect(buyer2).buyTokens({ value: weiValue });
    await crowdsale.connect(owner).setCrowdsaleStage(CrowdsaleStage.STAGE_7);
    await crowdsale.connect(buyer3).buyTokens({ value: weiValue });
    await crowdsale.connect(buyer4).buyTokens({ value: weiValue });

    await increaseTimeTo(vestingStart + vestingPeriod + 1);

    await expect(privateSellVesting.connect(buyer1).release(buyer1.address)).to.be.fulfilled;
    expect(await token.balanceOf(buyer1.address)).to.equal(tokensBoughtBuyer1);
  });

  it("Cannot vest a lot of tokens after long period of time", async function () {
    await increaseTimeTo(vestingStart + vestingPeriod * vestingPeriods * 5);

    const weiValue = maxInvestment;
    await crowdsale.connect(owner).setCrowdsaleStage(CrowdsaleStage.STAGE_6);
    await crowdsale.connect(buyer1).buyTokens({ value: weiValue });
    const tokensBoughtBuyer1 = await crowdsale.getRateWei(weiValue);
    await expect(privateSellVesting.connect(buyer1).release(buyer1.address)).to.be.fulfilled;

    expect(await privateSellVesting.releasableAmount(buyer1.address)).to.equal(0);
    expect(await token.balanceOf(buyer1.address)).to.equal(tokensBoughtBuyer1);
  });
});