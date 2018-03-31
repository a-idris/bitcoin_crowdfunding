/** 
 * Module exposing blockchain querying functions.
 * @module src/api
*/

var http = require('http');
var request = require('request');

var api = {};
const host = "http://testnet.blockchain.info/";

/**
 * get total balance from the addresses generated by the xpub
 * 
 * @member
 * @function getBalance
 * @param {string} xpub Extended public key 
 * @returns {Promise.<number|Error>} A promise that resolves with the balance or rejects with an Error if one is encountered  
 */
api.getBalance = function(xpub) {
    return new Promise((resolve, reject) => {
        http.get(host + `balance?active=${xpub}`, function(res) {      
            // streaming api, need to accumulate 
            let body = '';
            res.on('data', chunk => {
                body += chunk;
            });
            
            res.on('end', _ => {
                let result = JSON.parse(body);
                console.log(result);
                let balance = result[xpub].final_balance;
                return resolve(balance);
            });
    
            // if error is encountered, pass to callback
            res.on('error', err => {
                return reject(err);
            });        
        });    
    });
};

/**
 * @typedef utxo
 * @property {string} tx_hash
 * @property {number} tx_index
 * @property {number} tx_output_n
 * @property {string} script
 * @property {object} xpub
 * @property {number} value 
 * @property {number} confirmations
 */

/**
 * get list of UTXOs (unspent transaction outputs) belonging to the addresses generated by the xpub
 * Each unspent output object has the properties: tx_age, tx_hash, tx_index, tx_output_n, script, value
 * 
 * @member
 * @function getUnspent
 * @param {string} xpub Extended public key
 * @returns {Promise.<utxo[]|Error>} A promise that resolves with the list of UTXOs or rejects with an Error if one is encountered  
 */
api.getUnspent = function(xpub) {
    return new Promise((resolve, reject) => {
        http.get(host + `unspent?active=${xpub}`, function(res) {
            let body = '';
    
            res.on('data', chunk => {
                body += chunk;
            });
    
            res.on('end', _ => {
                let result = JSON.parse(body);
                console.log(result);
                return resolve(result.unspent_outputs);
            });
    
            // if error is encountered, pass to callback
            res.on('error', err => {
                return reject(err);
            });       
        });    
    });
};

/**
 * Will contain the information about the success of the send tx post request
 * 
 * @typedef {object} sendTxResponse
 * @param {number} response.status Status code of the http response
 * @param {string} response.message Body of the the response
 */ 

/**
 * send raw transaction to be transmitted to the Bitcoin network. 
 * 
 * @member
 * @function sendTx
 * @param {string} rawtx The raw hex encoded transaction
 * @returns {Promise.<sendTxResponse|Error>} A promise that resolves with the {@link sendTxResponse} object or rejects with an Error if one is encountered  
 */
api.sendTx = function (rawtx) {
    return new Promise((resolve, reject) => {
        request.post(host + "pushtx", { form: { tx: rawtx } }, function(err, response, body) {
            console.log('Status:', response.statusCode);
            console.log('Headers:', JSON.stringify(response.headers));
            console.log('Response:', body);
            if (err) {
                return reject(err);
            } else {
                return resolve({ status: response.statusCode, message: body });
            }
        });
    });
}

module.exports = api;