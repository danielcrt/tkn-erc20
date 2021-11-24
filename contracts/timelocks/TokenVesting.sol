//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

/**
 * @title TokenVesting
 * @dev A specific amount of tokens is released at a specific
 * interval for a specified number of intervals
 */
contract TokenVesting is OwnableUpgradeable {
    using SafeERC20Upgradeable for ERC20Upgradeable;

    event Released(address indexed beneficiary, uint256 amount);

    // Operator for this contract
    address public operator;

    // Address of the managed token
    ERC20Upgradeable public token;

    // beneficiary => amount of tokens after they are released
    mapping(address => uint256) public investments;

    // Number of released tokens
    uint256 public released;

    // Start time of the release
    uint256 public start;

    // Period of time (in seconds) between 2 release stages
    uint256 public period;

    // Vesting number of periods
    uint256 public numberOfPeriods;

    // Number of tokens to be release per period (if available)
    uint256 public tokensPerPeriod;

    modifier onlyOperator() {
        require(msg.sender == operator, "Not allowed");
        _;
    }

    /**
     * @param _operator Operator of this contract
     * @param _token Token being vested
     * @param _start Start of the vesting period
     * @param _period How much a period lasts
     * @param _numberOfPeriods How many periods are until the vesting is done
     * @param _tokensPerPeriod Number of tokens to be release per period (if available)
     */
    constructor(
        address _operator,
        ERC20Upgradeable _token,
        uint256 _start,
        uint256 _period,
        uint256 _numberOfPeriods,
        uint256 _tokensPerPeriod
    ) {
        __Ownable_init_unchained();
        operator = _operator;
        token = _token;
        start = _start;
        period = _period;
        numberOfPeriods = _numberOfPeriods;
        tokensPerPeriod = _tokensPerPeriod;
    }

    /**
     * @dev Updates the start time of the vesting period
     * @param _newStart New start timestamp
     */
    function updateStart(uint256 _newStart) external onlyOwner {
        // Do not allow start change if it's in the next 24h
        require(start > block.timestamp + 24 * 3600);
        require(_newStart > block.timestamp + 24 * 3600);
        start = _newStart;
    }

    /**
     * @dev Transfers vested tokens to beneficiary.
     * @param _beneficiary Beneficiary address
     */
    function release(address _beneficiary) external {
        uint256 unreleased = releasableAmount(_beneficiary);

        require(unreleased > 0);
        require(unreleased <= token.balanceOf(address(this)));

        released += unreleased;
        investments[_beneficiary] -= unreleased;

        token.safeTransfer(_beneficiary, unreleased);

        emit Released(_beneficiary, unreleased);
    }

    /**
     * @dev Calculates the amount that has already vested but hasn't been released yet.
     * @param _beneficiary Beneficiary address
     */
    function releasableAmount(address _beneficiary)
        public
        view
        returns (uint256)
    {
        if (block.timestamp < start + period) {
            // No tokens have been unlocked yet
            return 0;
        }
        uint256 elapsedPeriods = ((block.timestamp - start) / period);
        if (elapsedPeriods > numberOfPeriods) {
            elapsedPeriods = numberOfPeriods;
        }
        uint256 unlockedTokens = tokensPerPeriod * elapsedPeriods - released;
        if (investments[_beneficiary] > unlockedTokens) {
            return unlockedTokens;
        } else {
            return investments[_beneficiary];
        }
    }

    /**
     * @dev Saves the locked tokens
     * @param _beneficiary Investor's address
     * @param _tokenAmount Invested number of tokens
     */
    function lockTokens(address _beneficiary, uint256 _tokenAmount)
        public
        onlyOperator
    {
        investments[_beneficiary] += _tokenAmount;
    }

    /**
     * @dev Sets the contract operator
     * @param _operator Operator address
     */
    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }
}
