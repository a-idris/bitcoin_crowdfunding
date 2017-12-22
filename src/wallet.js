var bitcore = require('bitcore-lib');

//regtest setup 
bitcore.Networks.enableRegtest(); //enables regtest features
var network_type = bitcore.Networks.testnet;

//generates random address 
function generateAddress() {
    var private_key = new bitcore.PrivateKey();
    return private_key.toAddress(network_type);
}

document.getElementById('genAddress').addEventListener('click', function() {
    var addr = generateAddress();
    console.log(addr.toString());
    //display to user
    document.getElementById('address').textContent = addr.toString();
});

var form = document.getElementById('payment_form');

//add event listener to form that creates raw transaction and sets the hidden raw_tx field of the post request before the request is sent  
form.addEventListener('submit', function(event) {
    var sender_priv_key = bitcore.PrivateKey.fromString(form.elements['private_key'].value);
    var sender_addr = sender_priv_key.toAddress(network_type); 
    var destination_addr = bitcore.Address.fromString(form.elements['destination_addr'].value, network_type);
    var amount = satoshiToBitcoin(Number(form.elements['amount'].value));

    //utxo, hardcoded for now with an output owned by the regtest wallet for which the private key is known
    var utxo = new bitcore.Transaction.UnspentOutput({
        "txid": "8fdd75fee0a7b6a482864a1ca7ff3b47abb9608f03925104fe9904da718bcb37",
        "vout": 0,
        "address": sender_addr.toString(),
        "scriptPubKey": "21022c0dd1e8067fb486bd670b6750a22912ac34aa3ca4d1121a29f6fcd0c49a76baac",
        "amount": 50
    });

    //create transaction
    var transaction = bitcore.Transaction()
        .from(utxo)
        .to(destination_addr, amount)
        .change(sender_addr) //send remaining bitcoin from the input back to the sender address
        .sign(sender_priv_key); 

    //check it's valid
    result = transaction.verify();
    if (result === true) {
        var tx_string = transaction.serialize();
        form.elements['rawtx'].value = tx_string;
    } else {
        //display error messages
        console.log(result);
    }
});

//ajax send tx
function sendToServer(transaction) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "../../transmit", true);
    //set post value: tx_hex
    var params = "tx_hex="+transaction;
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var tx = JSON.parse(xhr.responseText);
            console.log(tx);
            form.reset();
        }
    }
    xhr.send(params)
}

//denomination conversion
function satoshiToBitcoin(satoshis) {
    return satoshis * 100000000;
}