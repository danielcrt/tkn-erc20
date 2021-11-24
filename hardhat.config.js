require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require('dotenv').config();
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      }
    }
  },
  networks: {
    localhost: {
      chainId: 31337,
      url: process.env.LOCALHOST_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  }
};
