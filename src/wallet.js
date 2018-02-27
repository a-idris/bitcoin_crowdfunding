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
            'satoshis': Number(utxos[i].amount), //amount is in satoshis
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
    });

    //add output
    //generate output address and change address 
    let xpub = xpriv.hdPublicKey;
    let output_address = key_utils.toAddress(key_utils.derive(xpub, `m/${external_index + 1}`));    
    let change_address = key_utils.toAddress(key_utils.derive(xpub, `m/${change_index + 1}`));

    // craft the transaction
    let transaction = new bitcore.Transaction()
        .from(utxos)
        .to(output_address, amount)
        .change(change_address)
        .sign(private_keys);

    // returns error message if invalid 
    let err = transaction.verify();
    if (err) {
        throw new Error(err);
    }
    return transaction.serialize();
}

module.exports = wallet;
