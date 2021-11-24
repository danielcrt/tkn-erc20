//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./TokenVesting.sol";

/**
 * @title PartnersAdvisorsVesting
 */
contract PartnersAdvisorsVesting is TokenVesting {
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
    )
        TokenVesting(
            _operator,
            _token,
            _start,
            _period,
            _numberOfPeriods,
            _tokensPerPeriod
        )
    {}
}
