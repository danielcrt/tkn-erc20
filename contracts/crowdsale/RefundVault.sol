//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title RefundVault
 * @dev This contract is used for storing funds while a crowdsale
 * is in progress. Supports refunding the money if crowdsale fails,
 * and forwarding it if crowdsale is successful.
 */
contract RefundVault is OwnableUpgradeable {
    enum State {
        Active,
        Refunding,
        Closed
    }

    mapping(address => uint256) public depositedWei;

    address public wallet;
    State public state;

    event Closed();
    event RefundsEnabled();
    event Refunded(address indexed beneficiary, uint256 weiAmount);

    /**
     * @param _wallet Vault address
     */
    constructor(address _wallet) {
        require(_wallet != address(0));
        wallet = _wallet;
        state = State.Active;
        __Ownable_init();
    }

    /**
     * @param investor Investor address
     */
    function deposit(address investor) public payable onlyOwner {
        require(state == State.Active);
        depositedWei[investor] = depositedWei[investor] + msg.value;
    }

    function close() public onlyOwner {
        require(state == State.Active);
        state = State.Closed;
        emit Closed();
        (bool success, ) = payable(wallet).call{value: address(this).balance}(
            ""
        );
        require(success, "Transfer failed");
    }

    function enableRefunds() public onlyOwner {
        require(state == State.Active);
        state = State.Refunding;
        emit RefundsEnabled();
    }

    /**
     * @param investor Investor address
     */
    function refund(address investor) external {
        require(state == State.Refunding);
        uint256 depositedWeiValue = depositedWei[investor];
        depositedWei[investor] = 0;
        (bool success, ) = payable(investor).call{value: depositedWeiValue}("");
        require(success, "Transfer failed");
        emit Refunded(investor, depositedWeiValue);
    }
}
