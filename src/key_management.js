const bitcore = require('bitcore-lib');
const Mnemonic = require('bitcore-mnemonic');

const config = require('../config.js');
var networkType = config.network;

bitcore.Networks.defaultNetwork = bitcore.Networks.testnet;
if (networkType == "mainnet") {
    bitcore.Networks.defaultNetwork = bitcore.Networks.livenet;
} else if (networkType == "regtest") {
    bitcore.Networks.enableRegtest(); 
}

// need this BIP-44 compliant path stem to be able to parse xpub on blockchain.info. 
// 44' - BIP, 0'/1' - bitcoin/ bitcoin testnet, 0' - account, 0/1 - external/internal. use internal only for change addresses
// m/44'/0'/0'/0 

// manually keep track of external and internal indices for easy new address generation

var keyutils = {}

var HDPrivateKey = bitcore.HDPrivateKey;
var HDPublicKey = bitcore.HDPublicKey;

keyutils.generateMnemonic = function() {
    // BIP-0039
    let code = new Mnemonic();
    console.log(code.toString());
    return code;
}

keyutils.validateMnemonic = function(code) {
    return Mnemonic.isValid(code);
}

keyutils.generateXpriv = function (code, seed_passphrase) {
    let mnemonic = new Mnemonic(code);
    let root = mnemonic.toHDPrivateKey(seed_passphrase); //optional passphrase
    let coinType = (bitcore.Networks.defaultNetwork == bitcore.Networks.testnet) ? 1 : 0;
    // generate xpriv starting from the user's account. 
    let root_path = `M/44'/${coinType}'/0'`; 
    return root.derive(root_path);
}

keyutils.generateXpub = function(code, seed_passphrase) {
    let xpriv = keyutils.generateXpriv(code, seed_passphrase);
    return xpriv.hdPublicKey;
}

keyutils.derive = function(xkey, type, path) {
    if (type === "xpub") {
        // if arg is HDPublicKey, will return itself. If string will instantiate HDPublicKey
        xkey = new HDPublicKey(xkey); 
    } else if (type == "xpriv") {
        xkey = new HDPrivateKey(xkey);
    }
    return xkey.derive(path);
}

keyutils.getAddress = function(xkey) {
    if (xkey instanceof HDPrivateKey) {
        return xkey.privateKey.toAddress();
    } else if (xkey instanceof HDPublicKey) {
        return new bitcore.Address(xkey.publicKey);
    }
}

module.exports = keyutils;