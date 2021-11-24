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

describe("TKNCrowdsale", function () {

    let accounts;
    let owner, vaultWallet, buyer1, buyer2, buyer3, buyer4;

    // TKN Token Info
    let name = "TKN Token";
    let symbol = "TKN";
    const decimals = 18;
    let softCap = ether('32000000');
    let crowdsaleTokens = ether('80000000');
    let crowdsaleStartTime;
    let rate = StageRate[CrowdsaleStage.STAGE_1];
    let vault;
    let chainId;
    let minInvestment = ether('0.001');
    let maxInvestment = ether('20');
    let privateSellVesting;
    let ethUsdOracle;
    let vestingStart;
    const vestingPeriod = 3 * duration.days(30);
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

    it("Token is deployed", async function () {
        expect(await token.name()).to.equal(name);
        expect(await token.symbol()).to.equal(symbol);
        expect(await token.totalSupply()).to.be.a.bignumber.equal(BN.from(1000000000).mul(BN.from(10).pow(decimals)));
    });

    it("Crowdsale is deployed", async function () {
        expect(await crowdsale.stage()).to.equal(CrowdsaleStage.STAGE_1);
    });

    it("Crowdsale cannot be initialized twice", async function () {
        await expect(crowdsale.connect(owner).__TKNCrowdsale_init(softCap,
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
        )).to.be.rejected;
    });

    it("Crowdsale owner can change the stage", async function () {
        await crowdsale.connect(owner).setCrowdsaleStage(CrowdsaleStage.STAGE_2);

        expect(await crowdsale.stage()).to.equal(CrowdsaleStage.STAGE_2);
    });

    it("Crowdsale sells at the correct rate", async function () {
        for (const stage of Object.keys(StageRate)) {
            // Crowdsale is already set in stage 1
            if (stage > 0) {
                await crowdsale.connect(owner).setCrowdsaleStage(stage);
            }

            expect(await crowdsale.rate()).to.equal(StageRate[stage]);
        }
    });

    it("Investor can buy tokens", async function () {
        const weiValue = minInvestment;
        await crowdsale.connect(buyer1).buyTokens({ value: weiValue });

        const tokensToBuy = await crowdsale.getRateWei(weiValue);
        expect(await token.balanceOf(buyer1.address)).to.equal(tokensToBuy.div(10));
        expect(await token.balanceOf(privateSellVesting.address)).to.equal(tokensToBuy.mul(90).div(100));
    });

    it("Funds go to vault until stage 6", async function () {
        const weiValue = minInvestment;
        const stage = CrowdsaleStage.STAGE_5;
        await crowdsale.connect(owner).setCrowdsaleStage(stage);

        const vaultBalance = await ethers.provider.getBalance(await vault.address);

        const tx = await crowdsale.connect(buyer1).buyTokens({ value: weiValue });

        const tokensToBuy = await crowdsale.getRateWei(weiValue);

        const newVaultBalance = BN.from(await ethers.provider.getBalance(await vault.address));
        expect(newVaultBalance).to.a.bignumber.equal(weiValue.add(vaultBalance));
        expect(await vault.depositedWei(buyer1.address)).to.equal(weiValue);
        expect(await token.balanceOf(buyer1.address)).to.equal(tokensToBuy.div(10));
        expect(await token.balanceOf(privateSellVesting.address)).to.equal(tokensToBuy.mul(90).div(100));
        expect(tx).to.emit(crowdsale, 'TokenPurchase')
            .withArgs(buyer1.address, buyer1.address, weiValue, tokensToBuy);
    });

    it("Funds go to crowdsale assigned wallet after stage 6", async function () {
        const weiValue = minInvestment;
        const stage = CrowdsaleStage.STAGE_6;
        await crowdsale.connect(owner).setCrowdsaleStage(stage);

        const crowdsaleBalance = await ethers.provider.getBalance(await crowdsale.wallet());

        const tx = await crowdsale.connect(buyer1).buyTokens({ value: weiValue });

        const newCrowdsaleBalance = BN.from(await ethers.provider.getBalance(await crowdsale.wallet()));
        expect(newCrowdsaleBalance).to.a.bignumber.equal(weiValue.add(crowdsaleBalance));

        const tokensToBuy = await crowdsale.getRateWei(weiValue);

        expect(await token.balanceOf(buyer1.address)).to.equal(tokensToBuy.div(10));
        expect(await token.balanceOf(privateSellVesting.address)).to.equal(tokensToBuy.mul(90).div(100));
        expect(tx).to.emit(crowdsale, 'TokenPurchase')
            .withArgs(buyer1.address, buyer1.address, weiValue, tokensToBuy);
    });


    it("Soft cap not reached. Refund enabled", async function () {
        const weiValue = minInvestment;
        // Test Same buyer buys twice
        await crowdsale.connect(buyer1).buyTokens({ value: weiValue });
        await crowdsale.connect(buyer1).buyTokens({ value: weiValue });

        await crowdsale.connect(owner).finalize();

        const tokensToBuy = await crowdsale.getRateWei(weiValue);

        const balanceBefore = await ethers.provider.getBalance(buyer1.address)
        const tx = await crowdsale.connect(buyer1).claimRefund();
        const receipt = await tx.wait();

        expect(await ethers.provider.getBalance(vault.address)).to.equal(0);
        expect(await vault.depositedWei(buyer1.address)).to.equal(0);
        expect(await token.balanceOf(buyer1.address)).to.equal(tokensToBuy.mul(2).mul(10).div(100));
        const balanceAfter = await ethers.provider.getBalance(buyer1.address);
        // Buyer should have his ether back minus the gas fee for claiming his ether
        expect(balanceAfter).to.equal(BN.from(balanceBefore).add(BN.from(weiValue * 2)).sub(receipt.cumulativeGasUsed * receipt.effectiveGasPrice));
    });

    it("Cannot buy more at this phase", async function () {
        await expect(crowdsale.connect(buyer1).buyTokens({ value: maxInvestment })).to.be.rejected;
    });

    it("Soft cap reached. Refund disabled. All funds to owner", async function () {
        const weiValue = maxInvestment;
        const initOwnerBalance = await ethers.provider.getBalance(owner.address);
        let ownerGas = BN.from(0);

        // We should buy more than soft cap
        let tx = await crowdsale.setCrowdsaleStage(CrowdsaleStage.STAGE_5);
        let receipt = await tx.wait();
        ownerGas = ownerGas.add(receipt.cumulativeGasUsed * receipt.effectiveGasPrice);

        const initVaultBalance = await ethers.provider.getBalance(vaultWallet.address);
        // These funds go to the vault
        await crowdsale.connect(buyer1).buyTokens({ value: weiValue });
        await crowdsale.connect(buyer2).buyTokens({ value: weiValue });

        // These funds go straight to the crowdsale wallet
        tx = await crowdsale.setCrowdsaleStage(CrowdsaleStage.STAGE_9);
        receipt = await tx.wait();
        ownerGas = ownerGas.add(receipt.cumulativeGasUsed * receipt.effectiveGasPrice);

        await crowdsale.connect(buyer3).buyTokens({ value: weiValue });
        await crowdsale.connect(buyer4).buyTokens({ value: weiValue });

        tx = await crowdsale.connect(owner).finalize();
        receipt = await tx.wait();
        ownerGas = ownerGas.add(receipt.cumulativeGasUsed * receipt.effectiveGasPrice);

        await expect(crowdsale.connect(buyer1).claimRefund()).to.be.rejected;

        expect(await ethers.provider.getBalance(vault.address)).to.equal(0);
        expect(await ethers.provider.getBalance(vaultWallet.address)).to.equal(initVaultBalance.add(weiValue.mul(2)));
        // Check if funds got back to owner. 
        // Multipy the wei with 2 because only 2 payments came from the vault
        expect(await ethers.provider.getBalance(await crowdsale.wallet())).to.equal(initOwnerBalance.add(weiValue.mul(2)).sub(ownerGas));
    });

});