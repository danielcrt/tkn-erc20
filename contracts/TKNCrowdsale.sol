//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "./crowdsale/USDCrowdsale.sol";
import "./crowdsale/FinalizableCrowdsale.sol";
import "./crowdsale/RefundVault.sol";
import "./TKNToken.sol";
import "./timelocks/PrivateSellVesting.sol";
import "hardhat/console.sol";

contract TKNCrowdsale is USDCrowdsale, FinalizableCrowdsale {
    // maximum amount of funds to be raised in tokens
    uint256 public hardCap;

    // minimum amount of funds to be raised in tokens
    uint256 public softCap;

    // Start of the first crowdsale stage
    uint256 public startTime;

    // refund vault used to hold funds while crowdsale is running
    RefundVault public vault;

    mapping(address => uint256) public contributions;

    // Minimum buy in wei
    uint256 public constant investorMinCap = 0.001 ether;

    // Maximum buy in wei
    uint256 public constant investorHardCap = 20 ether;

    string public constant STAGE_FULL_ERR = "Not enough tokens left";

    // Crowdsale Stages
    enum CrowdsaleStage {
        STAGE_1,
        STAGE_2,
        STAGE_3,
        STAGE_4,
        STAGE_5,
        STAGE_6,
        STAGE_7,
        STAGE_8,
        STAGE_9,
        STAGE_10,
        STAGE_11,
        STAGE_12
    }

    CrowdsaleStage public stage;

    /**
     * @notice A part of the raised funds will be locked for
     * a period of time
     */
    PrivateSellVesting public privateSellVesting;

    /**
     * @dev The locked % of the total sold tokens that should be locked
     * expressed with 2 decimals
     */
    uint256 public constant lockedPercentage = 9000;

    /**
     * @param _softCap Minimum goal
     * @param _hardCap Maximum amount of tokens available
     * @param _rate Initial rate for crowdsale stage 1
     * @param _wallet Address of the wallet used to send the tokens
     * @param _refundVault Address of the vault used to refund people if _softCap is not reached
     * @param _token Address of the token being sold
     * @param _ethUsdAggregator Address of the aggregator used to retrieve ETH/USD conversion
     * @param _vestingStart Start of vesting period
     * @param _vestingPeriod How long a period lasts
     * @param _vestingPeriods Numer of vesting periods
     */
    function __TKNCrowdsale_init(
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _rate,
        address _wallet,
        address _refundVault,
        ERC20Upgradeable _token,
        address _ethUsdAggregator,
        uint256 _vestingStart,
        uint256 _vestingPeriod,
        uint256 _vestingPeriods,
        uint256 _tokensPerPeriod
    ) external initializer {
        require(_wallet != address(0));
        require(_refundVault != address(0));

        require(_softCap > 0);
        require(_hardCap > _softCap);

        __USDCrowdsale_init_unchained(
            _rate,
            _wallet,
            _token,
            _ethUsdAggregator
        );
        __Ownable_init_unchained();
        __ReentrancyGuard_init_unchained();

        softCap = _softCap;
        hardCap = _hardCap;

        stage = CrowdsaleStage.STAGE_1;
        vault = RefundVault(_refundVault);

        privateSellVesting = new PrivateSellVesting(
            address(this),
            _token,
            _vestingStart,
            _vestingPeriod,
            _vestingPeriods,
            _tokensPerPeriod
        );

        // Make the deployer the owner of Private sell vesting
        // in order to be able to update the start date
        privateSellVesting.transferOwnership(msg.sender);
    }

    /**
     * @dev Allows admin to update the crowdsale stage
     * @param _stage Crowdsale stage
     */
    function setCrowdsaleStage(uint256 _stage) public onlyOwner {
        require(!isFinalized);
        require(_stage <= uint256(CrowdsaleStage.STAGE_12), "Invalid stage");
        require(_stage > uint256(stage), "Invalid stage");

        if (uint256(CrowdsaleStage.STAGE_1) == _stage) {
            stage = CrowdsaleStage.STAGE_1;
            rate = 250;
        } else if (uint256(CrowdsaleStage.STAGE_2) == _stage) {
            stage = CrowdsaleStage.STAGE_2;
            rate = 200;
        } else if (uint256(CrowdsaleStage.STAGE_3) == _stage) {
            stage = CrowdsaleStage.STAGE_3;
            rate = 166;
        } else if (uint256(CrowdsaleStage.STAGE_4) == _stage) {
            stage = CrowdsaleStage.STAGE_4;
            rate = 143;
        } else if (uint256(CrowdsaleStage.STAGE_5) == _stage) {
            stage = CrowdsaleStage.STAGE_5;
            rate = 133;
        } else if (uint256(CrowdsaleStage.STAGE_6) == _stage) {
            stage = CrowdsaleStage.STAGE_6;
            rate = 125;
        } else if (uint256(CrowdsaleStage.STAGE_7) == _stage) {
            stage = CrowdsaleStage.STAGE_7;
            rate = 118;
        } else if (uint256(CrowdsaleStage.STAGE_8) == _stage) {
            stage = CrowdsaleStage.STAGE_8;
            rate = 111;
        } else if (uint256(CrowdsaleStage.STAGE_9) == _stage) {
            stage = CrowdsaleStage.STAGE_9;
            rate = 105;
        } else if (uint256(CrowdsaleStage.STAGE_10) == _stage) {
            stage = CrowdsaleStage.STAGE_10;
            rate = 100;
        } else if (uint256(CrowdsaleStage.STAGE_11) == _stage) {
            stage = CrowdsaleStage.STAGE_11;
            rate = 100;
        } else if (uint256(CrowdsaleStage.STAGE_12) == _stage) {
            rate = 100;
            stage = CrowdsaleStage.STAGE_12;
        }
    }

    /**
     * @dev Set the start time of the crowdsale
     * @param _newStartTime The new start timestamp
     */
    function updateStartTime(uint256 _newStartTime) external onlyOwner {
        require(startTime == 0 || startTime > block.timestamp + 24 * 60 * 60);
        require(_newStartTime > block.timestamp + 24 * 60 * 60);
        startTime = _newStartTime;
    }

    /**
     * @dev Investors can claim refunds here if crowdsale is unsuccessful
     */
    function claimRefund() external {
        require(isFinalized);
        require(!goalReached());

        // Transfer the vested tokens from beneficiary
        // back to the crowdsale contract
        token.transferFrom(
            address(privateSellVesting),
            address(this),
            privateSellVesting.investments(msg.sender)
        );
        // Refund the beneficiary
        vault.refund(msg.sender);
    }

    /**
     * @dev Checks whether funding goal was reached.
     * @return Whether funding goal was reached
     */
    function goalReached() public view returns (bool) {
        return tokenRaised >= softCap;
    }

    /**
     * @dev vault finalization task, called when owner calls finalize()
     */
    function finalization() internal virtual override {
        if (goalReached()) {
            vault.close();

            TKNToken(address(token)).transferOwnership(wallet);
        } else {
            vault.enableRefunds();
        }

        super.finalization();
    }

    /**
     * @dev Overrides Crowdsale fund forwarding, sending funds to vault.
     */
    function _forwardFunds() internal virtual override {
        if (stage < CrowdsaleStage.STAGE_6) {
            vault.deposit{value: msg.value}(msg.sender);
        } else {
            super._forwardFunds();
        }
    }

    /**
     * @dev Checks whether the cap has been reached.
     * @return Whether the cap was reached
     */
    function capReached() public view returns (bool) {
        return tokenRaised >= hardCap;
    }

    /**
     * @dev Extend parent behavior requiring purchase to respect the funding cap.
     * @param _beneficiary Token purchaser
     * @param _weiAmount Amount of wei contributed
     */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount)
        internal
        virtual
        override
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);
        // Private sell should be started.
        require(startTime > 0 && startTime < block.timestamp, "Not started");
        // It will stop only after the hardcap is reached
        // or if the owner finalized it.
        require(!isFinalized, "Crowdsale finalized");
        if (CrowdsaleStage.STAGE_1 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 5000000 * 1 ether,
                STAGE_FULL_ERR
            ); // 5000000
        } else if (CrowdsaleStage.STAGE_2 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 10000000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 5000000
        } else if (CrowdsaleStage.STAGE_3 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 15000000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 5000000
        } else if (CrowdsaleStage.STAGE_4 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 20000000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 5000000
        } else if (CrowdsaleStage.STAGE_5 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 32000000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 12000000
        } else if (CrowdsaleStage.STAGE_6 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 42000000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 10000000
        } else if (CrowdsaleStage.STAGE_7 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 52000000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 10000000
        } else if (CrowdsaleStage.STAGE_8 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 62000000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 10000000
        } else if (CrowdsaleStage.STAGE_9 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 67500000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 5500000
        } else if (CrowdsaleStage.STAGE_10 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 72500000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 5000000
        } else if (CrowdsaleStage.STAGE_11 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= 77500000 * 1 ether,
                STAGE_FULL_ERR
            ); // + 5000000
        } else if (CrowdsaleStage.STAGE_12 == stage) {
            require(
                tokenRaised + _getTokenAmount(_weiAmount) <= hardCap,
                STAGE_FULL_ERR
            ); // + 2500000
        }

        uint256 _existingContribution = contributions[_beneficiary];
        uint256 _newContribution = _existingContribution + _weiAmount;
        require(
            _newContribution >= investorMinCap &&
                _newContribution <= investorHardCap,
            "Investor hard cap reached"
        );
        contributions[_beneficiary] = _newContribution;
    }

    /**
     * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends its tokens.
     * @param _beneficiary Address performing the token purchase
     * @param _tokenAmount Number of tokens to be emitted
     */
    function _deliverTokens(address _beneficiary, uint256 _tokenAmount)
        internal
        virtual
        override
    {
        uint256 lockedTokens = (lockedPercentage * _tokenAmount) / 100 / 100;
        // Transfer the unlocked tokens to the beneficiary
        token.transfer(_beneficiary, _tokenAmount - lockedTokens);

        // Transfer the tokens to the lock address
        token.transfer(address(privateSellVesting), lockedTokens);

        // Set the contribution of beneficiary inside the lock
        privateSellVesting.lockTokens(_beneficiary, lockedTokens);
    }
}
