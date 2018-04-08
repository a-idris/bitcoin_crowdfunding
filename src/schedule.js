const schedule = require('node-schedule');
const blockchain = require('src/api');

function scheduleRefund(refundTransaction, deadline) {
    var j = schedule.scheduleJob(deadline, function(refundTransaction) {
        blockchain.sendTx(refundTransaction)
        .then(response => {
            // double spend logic. mb reschedule.
            console.log("refund transaction submitted");
        })
        .catch(err => {
            console.log("error:", err);
        });
    }.bind(null, refundTransaction));    
}

