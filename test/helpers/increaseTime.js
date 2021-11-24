const { latestTime } = require('./latestTime');

// Increases ganache time by the passed duration in seconds
function increaseTime(duration) {
    return new Promise(async(resolve, reject) => {
        await ethers.provider.send("evm_increaseTime", [duration]);
        await ethers.provider.send("evm_mine");
        resolve();
    });
}

/**
 * Beware that due to the need of calling two separate ganache methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
async function increaseTimeTo(target) {
    let now = await latestTime();
    if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
    let diff = target - now;
    return increaseTime(diff);
}

const duration = {
    seconds: function(val) { return val; },
    minutes: function(val) { return val * this.seconds(60); },
    hours: function(val) { return val * this.minutes(60); },
    days: function(val) { return val * this.hours(24); },
    weeks: function(val) { return val * this.days(7); },
    years: function(val) { return val * this.days(365); },
};

module.exports = {
    increaseTime,
    increaseTimeTo,
    duration
}