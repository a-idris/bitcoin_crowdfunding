var http = require('http');

var api = {};

const host = "http://testnet.blockchain.info/";

api.getbalance = function(xpub, callback) {
    http.get(host + `balance?active=${xpub}`, function(res) {
        let body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            let result = JSON.parse(body);
            console.log(result);
            let balance = result[xpub].final_balance;
            callback(null, balance);
        });
    });    
};

api.getunspent = function(xpub, callback) {
    http.get(host + `unspent?active=${xpub}`, function(res) {
        let body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            let result = JSON.parse(body);
            console.log(result);
            callback(null, result.unspent_outputs);
        });
    });    
};

module.exports = api;