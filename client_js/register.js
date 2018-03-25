/** 
 * Client side code for /register page. Bundled to /public/js/bundle/register.js
 * @module client_js/register
 * @requires module:src/key_management
 * */

const keyutils = require('../src/key_management.js');

/**
 * On document ready, generate a random mnemonic using {@link module:src/key_management}
 * Registers event listeners to handle the xpub logic. Generates the xpub key from the mnemonic and optional seed_passphrase
 * @callback onReadyCallback
 */
$(document).ready(function() {
    $("#mnemonic").val(keyutils.generateMnemonic().toString());

    $('form#register').on('submit', function(event) {
        let code = $('#mnemonic').val();
        // validate the mnemonic first
        if (keyutils.validateMnemonic(code)) {
            let seed_passphrase = $('seed_passphrase').val();
            let xpub = keyutils.generateXpub(code, seed_passphrase).toString();
            // set the form field
            $('#xpub_key').val(xpub);
        } else {
            event.preventDefault();
            // todo: handle invalid mnemonic
            console.log("Error");
        }
    });
});

