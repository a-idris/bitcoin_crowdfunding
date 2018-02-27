const keyutils = require('../src/key_management.js');

$(document).ready(function() {
    $("#mnemonic").val(keyutils.generateMnemonic().toString());

    $('form#register').on('submit', function(event) {
        let code = $('#mnemonic').val();
        if (keyutils.validateMnemonic(code)) {
            let seed_passphrase = $('seed_passphrase').val();
            let xpub = keyutils.generateXpub(code, seed_passphrase).toString();
            $('#xpub_key').val(xpub);
        } else {
            event.preventDefault();
            console.log("Error");
        }
    });
});

