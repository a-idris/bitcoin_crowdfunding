/** 
 * Module handling wallet logic
 * @module
*/

const bitcore = require('bitcore-lib');
const key_utils = require('./key_management');

var wallet = {};
wallet.MIN_FEE_ESTIMATE = 10000;

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
    minFee = minFee || wallet.MIN_FEE_ESTIMATE;

    // gather list of inputs to be signed and gathered into a transaction client side 
    let accumAmount = 0;
    let i = 0;
    let inputs = [];
    for (let utxo of utxos) {
        accumAmount += utxo.value;
        let inputObj = {
            'txid': utxo.tx_hash_big_endian, 
            'vout': Number(utxo.tx_output_n),
            'scriptPubKey': utxo.script,
            'satoshis': utxo.value, // value is in satoshis
            'hd_path': utxo.xpub.path // append the path to be able to derive the private key for that path (e.g. for signature)
        };
        inputs.push(inputObj);

        if (accumAmount > amount + minFee) {
            return inputs;
        }
    }
    return null;    
}

wallet.getMinFeeEstimate = function() {
    return wallet.MIN_FEE_ESTIMATE;
}

function toBitcoinTime(dateStr) {
    let unixTime = Math.floor(Date.parse(dateStr) / 1000); // returns in milis, convert to seconds
    return unixTime;
    // return unixTime + 3600; // add an hour additional since bitcoin consensus time is approximately one hour behind
};

/**
 * 
 * @param {tx_output[]} inputs 
 * @param {number} amount 
 * @param {string} xpriv 
 * @param {number} external_index 
 * @param {number} change_index 
 */
wallet.createLockedOutput = function(inputs, amount, secretHash, deadline, xpriv, external_index, change_index) {
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

    let xpub = xpriv.hdPublicKey;
    let change_address = key_utils.getAddress(key_utils.derive(xpub, 'xpub', `m/1/${change_index}`));
    
    // craft the transaction
    let transaction = new bitcore.Transaction().from(utxos);

    let privateKey = key_utils.derive(xpriv, 'xpriv', `m/0/${external_index}`).privateKey;

    // create the P2SH output
    let locktime = toBitcoinTime(deadline);
    let redeemScript = lockedOutputRedeemScript(secretHash, privateKey.publicKey, locktime);
    let output = new bitcore.Transaction.Output({
        script: redeemScript.toScriptHashOut(), // convert to P2SH form
        satoshis: amount
    });

    transaction = transaction.addOutput(output).change(change_address).sign(private_keys);

    // returns error message if invalid 
    let result = transaction.verify();
    if (result === true) {
        // get the address for the next index. use external.
        let refundAddress = key_utils.getAddress(key_utils.derive(xpub, 'xpub', `m/0/${external_index+1}`));    
        let refundTransaction = wallet.createRefundTransaction(transaction, refundAddress, privateKey, redeemScript, locktime);

        // return the transaction as well as the redeemScript that will be needed later.
        return { 
            transaction: transaction,
            redeemScript: redeemScript, 
            refundTransaction: refundTransaction 
        };
    }
    throw new Error(result);
}

/**
 * Convenience method to convert script strings into Scripts. Handles data pushes and whitespace.
 * 
 * @param {string} scriptString 
 * @param {Buffer[]} dataParams 
 */
function toScript(scriptString) {
    scriptString = trimWhitespace(scriptString);
    let tokens = scriptString.split(' ');

    // reduce the list of tokens to a script
    let finalScript = tokens.reduce((script, token) => {
        if (token.startsWith("<")) {
            // strip 
            hexString = token.replace( /[<>]/g, '' );
            // add data params as buffers to be added correctly i.e. it will add the appropriate data length opcode
            script.add(Buffer.from(hexString, 'hex'));
        } else {
            script.add(token);
        }
        return script;
    }, new bitcore.Script());

    return finalScript;
}

function trimWhitespace(scriptString) {
    let trimmed =  scriptString.trim();
    return trimmed.replace(/\s+/g, ' ');
}

function changeEndianness(hexString) {
    let result = [];
    let startIndex = 0;
    while (startIndex <= hexString.length - 2) {
        result.unshift(hexString.substr(startIndex, 2));
        startIndex += 2;
    }
    return result.join('');
}

function lockedOutputRedeemScript(secretHash, publicKey, locktime) {
    let publicKeyHex = publicKey.toString();
    // hex encode locktime. also need to switch endianness
    let locktimeHex = changeEndianness(locktime.toString(16));

    let scriptString = `
        OP_HASH160 <${secretHash}> OP_EQUAL
        OP_NOTIF
            <${locktimeHex}> OP_CHECKLOCKTIMEVERIFY OP_DROP
        OP_ENDIF
        <${publicKeyHex}> 
        OP_CHECKSIG
    `;

    let redeemScript = toScript(scriptString);
    return redeemScript;
}

wallet.createRefundTransaction = function(prevTransaction, refundAddress, privateKey, redeemScript, locktime) {
    // create the input from the transaction object. 
    let inputObj = {};
    inputObj.prevTxId = prevTransaction.hash;
    inputObj.outputIndex = 0; // will always be 0 index because of the way the tx is created  
    inputObj.output = prevTransaction.outputs[inputObj.outputIndex];
    inputObj.script = new bitcore.Script();

    let input = new bitcore.Transaction.Input(inputObj);
    // generate the output. spend the same a
    
    // need to include a fee. take it out of the output.
    let amount = inputObj.output.satoshis - wallet.MIN_FEE_ESTIMATE;

    let transaction = new bitcore.Transaction()
        .addInput(input)
        .to(refundAddress, amount)
        .lockUntilDate(locktime + 1); // set the locktime such that it exceeds the deadline encoded in the redeemscript

    let signature = getSignature(transaction, privateKey, input, 0, SIGHASH_ALL_ANYONECANPAY, redeemScript);
    let scriptSig = buildScriptSig(signature, redeemScript);
    input.setScript(scriptSig); // will tx get updated? NEED TO CHECK W/ BREAKPOINTS

    // conduct sanity checks of the transaction. Interpreter.verify()
    let result = transaction.verify();
    if (result === true) {
        // to verify scripts
        flags = bitcore.Script.Interpreter.SCRIPT_VERIFY_P2SH | bitcore.Script.Interpreter.SCRIPT_VERIFY_DERSIG | bitcore.Script.Interpreter.SCRIPT_VERIFY_LOW_S | bitcore.Script.Interpreter.SCRIPT_VERIFY_STRICTENC | bitcore.Script.Interpreter.SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY
        interpretScript(input.script, input.output.script, transaction, 0, flags);

        return transaction;
    } else {
        // result will contain the error message
        throw new Error(result);
    }       
}


const SIGHASH_ALL_ANYONECANPAY = bitcore.crypto.Signature.SIGHASH_ALL | bitcore.crypto.Signature.SIGHASH_ANYONECANPAY;

/**
 * 
 * @param {*} prevTransaction 
 * @param {*} outputInfo 
 * @param {*} privateKey 
 * 
 * @returns {Transaction} the partial transaction
 * @throws {Error} Will contain the error message from not passing Transaction.verify()
 */
wallet.createPartial = function(prevTransaction, outputInfo, privateKey, redeemScript, secret) {
    // create the input from the transaction object. 
    let inputObj = {};
    inputObj.prevTxId = prevTransaction.hash;
    inputObj.outputIndex = 0; // will always be 0 index because of the way the tx is created  
    inputObj.output = prevTransaction.outputs[inputObj.outputIndex]; // the output this inputObj is referring to
    inputObj.script = new bitcore.Script(); // initially empty, need to complete the transaction before generating the scriptSig

    let input = new bitcore.Transaction.Input(inputObj);
    let transaction = new bitcore.Transaction()
        .addInput(input)
        .to(outputInfo.address, outputInfo.fund_goal);
    
    let signature = getSignature(transaction, privateKey, input, 0, SIGHASH_ALL_ANYONECANPAY, redeemScript);
    let scriptSig = buildScriptSig(signature, redeemScript, secret);
    input.setScript(scriptSig); // will tx get updated? NEED TO CHECK W/ BREAKPOINTS

    // conduct sanity checks of the transaction. Interpreter.verify()
    let result = transaction.verify();
    if (result === true) {

        // to verify scripts
        // flags = bitcore.Script.Interpreter.SCRIPT_VERIFY_P2SH | bitcore.Script.Interpreter.SCRIPT_VERIFY_DERSIG | bitcore.Script.Interpreter.SCRIPT_VERIFY_LOW_S | bitcore.Script.Interpreter.SCRIPT_VERIFY_STRICTENC
        // interpretScript(input.script, input.output.script, transaction, 0, flags);

        return transaction;
    } else {
        // result will contain the error message
        throw new Error(result);
    }
}

function interpretScript(scriptSig, scriptPubkey, tx, inputIndex, flags) {
    bitcore.Script.Interpreter().verify(scriptSig, scriptPubkey, tx, inputIndex, flags);
}

function getSignature(transaction, privateKey, input, index, sigtype, redeemScript) {
    sigtype = sigtype || bitcore.crypto.Signature.SIGHASH_ALL;
    let signature = bitcore.Transaction.Sighash.sign(transaction, privateKey, sigtype, index, redeemScript);
    return bitcore.Script.buildPublicKeyIn(signature.toDER(), sigtype);
}

function buildScriptSig(signature, redeemScript, secret) {
    // only data pushing operations
    let serializedRedeem = redeemScript.toHex();
    let script = new bitcore.Script();
    // appending buffers will automatically handle the length opcodes (e.g. PUSHDATA)
    script.add(signature);
    // the secret parameter is optional
    if (secret) {
        script.add(Buffer.from(secret, 'hex'));
    } else {
        // add 0 on to stack to be consumed by the hashlock
        script.add('OP_0');
    }
    script.add(Buffer.from(serializedRedeem, 'hex'));
    return script;
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

wallet.compileTransaction = function(pledgeInputs, outputInfo) {
    let transaction = new bitcore.Transaction().to(outputInfo.address, outputInfo.fund_goal);
    
    // attach the inputs to the transaction
    // let inputs = pledgeInputs.map(object => new bitcore.Transaction.Input.PublicKeyHash(object));
    let inputs = pledgeInputs.map(object => new bitcore.Transaction.Input(object));
    for (let input of inputs) {
        transaction.addInput(input);
    }

    let result = transaction.verify();
    if (result === true) {
        return transaction;
    } else {
        throw new Error(result);
    }    
}

wallet.toBtc = function(satoshis) {
    return bitcore.Unit.fromSatoshis(satoshis).toBTC();
}

wallet.convertToBtc = function(objects, properties) {
    if (!objects || objects.length === 0) 
        return objects;

    let converted = objects.map(obj => {
        for (let prop of properties) {
            obj[prop] = wallet.toBtc(obj[prop]);
        }
        return obj;
    });

    return converted;
}

wallet.toSatoshis = function(btc) {
    return bitcore.Unit.fromBTC(btc).toSatoshis();
}

wallet.hash160 = function(buffer, asString) {
    let hash =  bitcore.crypto.Hash.sha256ripemd160(buffer);
    return asString ? hash.toString('hex') : hash;
}

module.exports = wallet;
