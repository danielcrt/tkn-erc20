function ether(n) {
    return new ethers.utils.parseEther(n);
}

module.exports = {
    ether
}