const nodeSchedule = require('node-schedule');
const blockchain = require('./api');

var schedule = {};

schedule.scheduleRefund = function(transaction, deadline, retryCount) {
    retryCount = retryCount || 0;
    if (retryCount > 3) {
        return false;
    }

    var j = nodeSchedule.scheduleJob(deadline, function(refundTransaction) {
        blockchain.sendTx(refundTransaction)
        .then(response => {
            // double spend logic. mb reschedule.
            console.log("refund transaction sent to network: ", refundTransaction);
            console.log(response);

            // retry, in case the network consensus time hasn't caught up yet
            if (response.status !== 200) {
                // retry in an hour
                let retryTime = new Date(deadline.getTime() + 3600 * 1000);
                if (!schedule.scheduleRefund(refundTransaction, retryTime, retryCount + 1)) {
                    console.log("Retry limit reached, some problem with the refund transaction", refundTransaction);
                }
            } else {
                console.log("refund transaction successful");
            }
        })
        .catch(err => {
            console.log("error:", err);
        });
    }.bind(null, transaction));    

    return true;
}

module.exports = schedule;