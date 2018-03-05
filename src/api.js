var http = require('http');
var request = require('request');

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

api.sendtx = function(rawtx, callback) {
    request.post(host + "pushtx", { form: { tx: rawtx } }, function(err, response, body) {
        console.log('Status:', response.statusCode);
        console.log('Headers:', JSON.stringify(response.headers));
        console.log('Response:', body);
        if (err) {
            callback(err);
        } else {
            callback(null, { status: response.statusCode, message: body });
        }
    });
}

module.exports = api;