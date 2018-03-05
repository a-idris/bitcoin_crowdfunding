const bitcore = require('bitcore-lib');
const key_utils = require('./key_management');

var wallet = {};

wallet.chooseInputs = function(utxos, amount) {
    // gather list of inputs to be signed and gathered into a transaction client side 
    let accumAmount = 0;
    let i = 0;
    let inputs = [];
    while (accumAmount < amount) {
        accumAmount += utxos[i].value;
        let inputObj = {
            'txid': utxos[i].tx_hash_big_endian, 
            'vout': Number(utxos[i].tx_output_n),
            'scriptPubKey': utxos[i].script,
            'satoshis': utxos[i].value, // value is in satoshis
            'hd_path': utxos[i].xpub.path
        };
        inputs.push(inputObj);
        i++;
    }
    return inputs;    
}

wallet.createExactAmount = function(inputs, amount, xpriv, external_index, change_index) {
    let private_keys = [];
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

function createPartial(prevTransaction, outputInfo, privateKey) {
    // create the input from the transaction object. 
    let inputObj = {};
    inputObj.prevTxId = transactionObject.hash;
    inputObj.outputIndex = 0; // will always be 0 index because of the way the tx is created
    // leave default sequence number
    // inputObj.sequenceNumber = bitcore.Transaction.Input.DEFAULT_SEQNUMBER;
    
    inputObj.output = transactionObject.outputs[inputObj.outputIndex];
    // inputObj.script = inputObj.output.script;

    let output = new bitcore.Transaction.Output({
        script: new bitcore.Script(new Address(outputInfo.address)),
        amount: outputInfo.amount
    });

    let input = new bitcore.Transaction.Input(inputObj);
    let unsigned_tx = new bitcore.Transaction()
        .addInput(input)
        .addOutput(output);

    // get the signature for the input and apply it, with sigtype SIGHASH_ALL | SIGHASH_ANYONECANPAY
    let pubkeyHash = bitcore.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer());
    let transactionSignature = input.getSignatures(unsigned_tx, privateKey, 0, SIGHASH_ALL_ANYONECANPAY, pubkeyHash)[0]; //only 1 input, length of returned array = 1
    unsigned_tx.applySignature(transactionSignature);
    
    let result = transaction.verify();
    if (true) {
        return transaction;
    }
    // toObject.inputs[0].toBuffer.tohex()
    // 
}

wallet.toBtc = function(satoshis) {
    return bitcore.Unit.fromSatoshis(satoshis).toBTC();
}

wallet.toSatoshis = function(btc) {
    return bitcore.Unit.fromBTC(btc).toSatoshis();
}

module.exports = wallet;
