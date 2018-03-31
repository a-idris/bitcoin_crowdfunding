/** 
 * Module handling wallet logic
 * @module
*/

const bitcore = require('bitcore-lib');
const key_utils = require('./key_management');

var wallet = {};

/**
 * @typedef tx_output
 * @property {string} tx_id
 * @property {number} vout
 * @property {string} scriptPubKey
 * @property {number} satoshis
 * @property {string} hd_path 
 */

/**
 * return list of outputs to be used as inputs gathered from the list of utxos such that 
 * the sum amount of the inputs >= amount + minFee. 
 * Used to get a list of inputs to be able to create an output with the desired amount. 
 * 
 * @member
 * @function chooseInputs
 * @param {utxo[]} utxos 
 * @param {number} amount
 * @param {number} [minFee] The size of the transaction fee to account for.   
 * @returns {tx_output[]} The list of tx outputs to be used as inputs.
 */
wallet.chooseInputs = function(utxos, amount, minFee) {
    // set default minFee. 
    minFee = minFee || 100000;

    // gather list of inputs to be signed and gathered into a transaction client side 
    let accumAmount = 0;
    let i = 0;
    let inputs = [];
    while (accumAmount < amount + minFee) {
        accumAmount += utxos[i].value;
        let inputObj = {
            'txid': utxos[i].tx_hash_big_endian, 
            'vout': Number(utxos[i].tx_output_n),
            'scriptPubKey': utxos[i].script,
            'satoshis': utxos[i].value, // value is in satoshis
            'hd_path': utxos[i].xpub.path // append the path to be able to derive the private key for that path (e.g. for signature)
        };
        inputs.push(inputObj);
        i++;
    }
    return inputs;    
}

/**
 * 
 * @param {tx_output[]} inputs 
 * @param {number} amount 
 * @param {string} xpriv 
 * @param {number} external_index 
 * @param {number} change_index 
 */
wallet.createExactAmount = function(inputs, amount, xpriv, external_index, change_index) {
    let private_keys = [];
    // convert inputs to suitable form
    let utxos = inputs.map(inputObj => {
        // get the private keys needed to generate the signatures then delete hd_path
        let corresponding_priv_key = key_utils.derive(xpriv, 'xpriv', inputObj.hd_path).privateKey;
        private_keys.push(corresponding_priv_key);
        // also need address attribute
        inputObj.address = corresponding_priv_key.toAddress();
        delete inputObj.hd_path;
        return inputObj;
    });

    //add output
    //generate output address and change address 
    let xpub = xpriv.hdPublicKey;
    let output_address = key_utils.getAddress(key_utils.derive(xpub, 'xpub', `m/0/${external_index}`));    
    let change_address = key_utils.getAddress(key_utils.derive(xpub, 'xpub', `m/1/${change_index}`));

    // craft the transaction
    let transaction = new bitcore.Transaction()
        .from(utxos)
        .to(output_address, amount)
        .change(change_address)
        .sign(private_keys);

    // returns error message if invalid 
    let result = transaction.verify();
    if (result === true) {
        return transaction;
    }
    throw new Error(result);
}


const SIGHASH_ALL_ANYONECANPAY = bitcore.crypto.Signature.SIGHASH_ALL | bitcore.crypto.Signature.SIGHASH_ANYONECANPAY;

// todo
// function txOutputToInput(txObj, index)
// function createPartial(input, output);

/**
 * 
 * @param {*} prevTransaction 
 * @param {*} outputInfo 
 * @param {*} privateKey 
 * 
 * @returns {Transaction} the partial transaction
 * @throws {Error} Will contain the error message from not passing Transaction.verify()
 */
wallet.createPartial = function(prevTransaction, outputInfo, privateKey) {
    // create the input from the transaction object. 
    let inputObj = {};
    inputObj.prevTxId = prevTransaction.hash;
    inputObj.outputIndex = 0; // will always be 0 index because of the way the tx is created  
    inputObj.output = prevTransaction.outputs[inputObj.outputIndex];
    inputObj.script = new bitcore.Script();

    let input = new bitcore.Transaction.Input.PublicKeyHash(inputObj);
    let transaction = new bitcore.Transaction()
        .addInput(input)
        .to(outputInfo.address, outputInfo.fund_goal);
        // .addOutput(output);

    let pubkeyHash = bitcore.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer());
     // get the signature for the input and apply it, with sigtype SIGHASH_ALL | SIGHASH_ANYONECANPAY
    let transactionSignature = input.getSignatures(transaction, privateKey, 0, SIGHASH_ALL_ANYONECANPAY, pubkeyHash)[0]; //only 1 input, length of returned array = 1
    transaction.applySignature(transactionSignature);
    
    // conduct sanity checks of the transaction
    let result = transaction.verify();
    if (result === true) {
        return transaction;
    } else {
        // result will contain the error message
        throw new Error(result);
    }
}

/**
 * @typedef Input
 * @property {string} prevTxId the id of the tx containing this output
 * @property {number} outputIndex the index of this output in tx referenced by prevTxId
 * @property {number} sequenceNumber
 * @property {string} script the script as a hex string
 * @property {object} output
 * @property {number} output.satoshis The value / amount in the output (in satoshis)
 * @property {object} output.script The locking script for the output in prevTx 
 * @property {string} [scriptString] human readable form of the script
 */

/**
 * @param {Transaction} transaction 
 * @param {number} [index=0]
 * 
 * @returns {Input} the Input object 
 */
wallet.getInput = function(transaction, index) {
    // default index to 0
    index = index || 0;
    let inputs = transaction.toObject().inputs;
    return inputs[index]; 
}

wallet.toBtc = function(satoshis) {
    return bitcore.Unit.fromSatoshis(satoshis).toBTC();
}

wallet.toSatoshis = function(btc) {
    return bitcore.Unit.fromBTC(btc).toSatoshis();
}

module.exports = wallet;
