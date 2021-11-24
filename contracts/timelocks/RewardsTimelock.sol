//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./TokenTimelock.sol";

/**
 * @title RewardsTimelock
 */
contract RewardsTimelock is TokenTimelock {
    constructor(
        ERC20Upgradeable _token,
        address _beneficiary,
        uint64 _releaseTime
    ) TokenTimelock(_token, _beneficiary, _releaseTime) {}
}
