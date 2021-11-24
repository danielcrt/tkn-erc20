// Returns the time of the last mined block in seconds
async function latestTime() {
    const block = await ethers.provider.getBlock('latest')
    return block.timestamp;
}

module.exports = {
    latestTime
}