var bitcore = require('bitcore-lib');
var path = require('path')

bitcore.Networks.enableRegtest(); //needed?
var network_type = bitcore.Networks.testnet;


//block explorer to display wallet balance.

function generateAddress() {
    //generates random address 
    var private_key = new bitcore.PrivateKey();
    console.log('breakpoint hit');
    return private_key.toAddress(network_type);
}

document.getElementById('genAddress').addEventListener('click', function() {
    var addr = generateAddress();
    console.log(addr.toString());
    document.getElementById('address').textContent = addr.toString();
});

// var form = document.getElementsByTagName('Form')[0];
var form = document.getElementById('payment_form');


form.addEventListener('submit', function(event) {
    event.preventDefault();
    var sender_priv_key = bitcore.PrivateKey.fromString(form.elements['private_key'].value);
    var sender_addr = sender_priv_key.toAddress(network_type); 
    var destination_addr = bitcore.Address.fromString(form.elements['destination_addr'].value, network_type);
    var amount = satoshiToBitcoin(Number(form.elements['amount'].value));

    //create transaction

    //hardcoded for now
    var utxo = new bitcore.Transaction.UnspentOutput({
        "txid": "8fdd75fee0a7b6a482864a1ca7ff3b47abb9608f03925104fe9904da718bcb37",
        "vout": 0,
        "address": sender_addr.toString(),
        "scriptPubKey": "21022c0dd1e8067fb486bd670b6750a22912ac34aa3ca4d1121a29f6fcd0c49a76baac",
        "amount": 50
    });

    var transaction = bitcore.Transaction()
        .from(utxo)
        .to(destination_addr, amount)
        .change(sender_addr)
        .sign(sender_priv_key); 

    result = transaction.verify();
    console.log("ERR: " + result);
    if (result === true) {
        var tx_string = transaction.serialize();
        sendToServer(tx_string);        
    } else {
        //display error messages
        console.log(result);
    }
});

function sendToServer(transaction) {
    var xhr = new XMLHttpRequest();
    // xhr.open("POST", path.join("..","..", "transmit"), true);
    xhr.open("POST", "../../transmit", true);
    //set post value: tx_hex
    var params = "tx_hex="+transaction;
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(params)
}

function satoshiToBitcoin(satoshis) {
    return satoshis * 100000000;
}