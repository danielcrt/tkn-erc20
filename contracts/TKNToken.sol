//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title TKNToken
 * @notice ERC20 token
 */
contract TKNToken is
    Initializable,
    OwnableUpgradeable,
    ERC20Upgradeable,
    ERC20PausableUpgradeable
{
    /**
     * @notice Initializes the ERC20 token
     * @param _name Name of the token
     * @param _symbol Symbol of the token
     */
    function initialize(string memory _name, string memory _symbol)
        external
        initializer
    {
        __ERC20_init(_name, _symbol);
        __Ownable_init_unchained();
        __ERC20Pausable_init_unchained();

        _mint(_msgSender(), 1000000000 * 10**18);
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
