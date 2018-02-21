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

var wallet = {}

var HDPrivateKey = bitcore.HDPrivateKey;
var HDPublicKey = bitcore.HDPublicKey;

wallet.generateMnemonic = function() {
    // BIP-0039
    let code = new Mnemonic();
    console.log(code.toString());
    return code;
}

wallet.validateMnemonic = function(code) {
    return Mnemonic.isValid(code);
}

wallet.generateXpriv = function (code, seed_passphrase) {
    let mnemonic = new Mnemonic(code);
    return mnemonic.toHDPrivateKey(seed_passphrase); //optional passphrase
}

wallet.generateXpub = function(code, seed_passphrase) {
    let xpriv = wallet.generateXpriv(code, seed_passphrase);
    let coinType = 1;
    // generate xpub starting from the user's account. 
    let xpub_path = `M/44'/${coinType}'/0'`; 
    return xpriv.derive(xpub_path).hdPublicKey;
}

wallet.derive = function(xpub, path) {
    xpub = new HDPublicKey(xpub); // if arg is HDPublicKey, will return itself. If string will instantiate HDPublicKey
    return xpub.derive(path);
}

wallet.getAddress = function(xpub) {
    return new bitcore.Address(xpub.publicKey);
}

wallet.getPath = function(index, isChange, isTestnet) {
    let coinType = isTestnet ? 1 : 0;
    let roleType = isChange ? 1 : 0;
    return `m/44'/${coinType}'/0'/${roleType}/${index}`;
}

module.exports = wallet;