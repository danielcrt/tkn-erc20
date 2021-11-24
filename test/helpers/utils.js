
const CrowdsaleStage = {
  STAGE_1: 0,
  STAGE_2: 1,
  STAGE_3: 2,
  STAGE_4: 3,
  STAGE_5: 4,
  STAGE_6: 5,
  STAGE_7: 6,
  STAGE_8: 7,
  STAGE_9: 8,
  STAGE_10: 9,
  STAGE_11: 10,
  STAGE_12: 11,
};

const StageRate = {
  [CrowdsaleStage.STAGE_1]: 250,
  [CrowdsaleStage.STAGE_2]: 200,
  [CrowdsaleStage.STAGE_3]: 166,
  [CrowdsaleStage.STAGE_4]: 143,
  [CrowdsaleStage.STAGE_5]: 133,
  [CrowdsaleStage.STAGE_6]: 125,
  [CrowdsaleStage.STAGE_7]: 118,
  [CrowdsaleStage.STAGE_8]: 111,
  [CrowdsaleStage.STAGE_9]: 105,
  [CrowdsaleStage.STAGE_10]: 100,
  [CrowdsaleStage.STAGE_11]: 100,
  [CrowdsaleStage.STAGE_12]: 100,
};

const ethUsdAggregator = {
  1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH Mainnet
  4: '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e', // ETH Rinkeby
  42: '0x9326BFA02ADD2366b30bacB125260Af641031331', // ETH Kovan
  31337: ethers.constants.ZERO_ADDRESS // Hardhat
};


module.exports = {
  CrowdsaleStage, StageRate, ethUsdAggregator
}