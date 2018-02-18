const wallet = require('../src/key_management.js')

$(document).ready(function() {
    $("#mnemonic").val(wallet.generateMnemonic().toString());

    $('form#register').on('submit', function(event) {
        let code = $('#mnemonic').val();
        if (wallet.validateMnemonic(code)) {
            let seed_passphrase = $('seed_passphrase').val();
            let xpub = wallet.generateXpub(code, seed_passphrase);
            $('#xpub_key').val(xpub);
        } else {
            event.preventDefault();
            console.log("Error");
        }
    });
});

