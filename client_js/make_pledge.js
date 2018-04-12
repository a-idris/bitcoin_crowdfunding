/** 
 * Client side code for pledge logic of /projects/:id page. Bundled to /public/js/bundle/make_pledge.js
 * @module client_js/make_pledge
 * @requires module:src/key_management
 * @requires module:src/wallet
 * */

const wallet = require('../src/wallet');
const keyutils = require('../src/key_management');

/**
 * Registers the pledge form submit event listener that will start the interaction. 
 * 
 * @callback onReadyCallback
 */
$(document).ready(function() {
    $('form#make_pledge').on('submit', function(event) {
        event.preventDefault();
        
        // use an object to keep track of context
        let context = {};
        context.this_form = this;
        context.form_data = {
            amount: $(context.this_form).find('input[name=amount]').val(),
            mnemonic: $(context.this_form).find('input[name=mnemonic]').val()
        };
        context.url = $(context.this_form).attr('action'); // use url from form action attribute

        // make the initial stage post request
        $.ajax({
            type: "POST",
            url: context.url, 
            data: { 
                amount: context.form_data.amount
            }, // don't pass mnemonic 
            success: createLockedOutput.bind(context), // bind context object to be used as 'this' 
            error: displayError.bind(context.this_form), // bind form context
            dataType: 'json'
        });
    });
});

/**
 * 
 * @param {object} data 
 * @param {object[]} data.inputs the JSON encoded tx inputs returned from the server
 * @param {string} data.secretHash 
 * @param {string} data.deadline project deadline
 */
function createLockedOutput(data) {
    // convert the mnemonic to an xpriv key. this will be used for signing.
    let xpriv = keyutils.generateXpriv(this.form_data.mnemonic);
    let cookie = parseCookie();

    // create a transaction that creates a UTXO with value equal to the exact amount 
    let result = wallet.createLockedOutput(data.inputs, Number(this.form_data.amount), data.secretHash, data.deadline, xpriv, Number(cookie.external_index), Number(cookie.change_index));
    let transaction = result.transaction;
    let redeemScript = result.redeemScript;
    // serialize, disabling signature check since the library doesn't recognize custom scripts even though they're correct
    this.refundTransaction = result.refundTransaction.serialize({disableIsFullySigned: true});
    
    // the transaction is sending the amount to the public key address at external_index. save the private key corresponding to this public key
    this.privateKey = keyutils.derive(xpriv, 'xpriv', `m/0/${cookie.external_index}`).privateKey;

    $.ajax({
        type: "POST",
        url: this.url, // the same url
        data: { 
            stage: "transmitExactAmount", // the next stage. the server will transmit the transaction
            serialized_tx: transaction.serialize(), 
            refund_tx: this.refundTransaction
        },
        success: data => {
            // bind 'this' so that createPartial has access to the private key
            createPartial.call(this, transaction.toObject(), redeemScript, data)
        },
        error: displayError.bind(this.this_form),
        dataType: 'json'
    });
}

/**
 * 
 * @param {Transaction} prevTransaction The transaction created in {@link createLockedOutput}
 * @param {Script} redeemScript the redeem script for prevTransaction
 * @param {object} outputInfo The project info
 * @param {string} outputInfo.address 
 * @param {number} outputInfo.fund_goal
 * @param {string} outputInfo.secret the secret token to use as preimage to unlock the output
 */
//function makePledgeTransaction
function createPartial(prevTransaction, redeemScript, outputInfo) {
    outputInfo.fund_goal = Number(outputInfo.fund_goal);
    let secret = outputInfo.secret; 
    // craft the final transaction, making the pledge of the exact amount to the project creator
    let transaction = wallet.createPartial(prevTransaction, outputInfo, this.privateKey, redeemScript, secret);
    // just need the input of this transaction - the rest can be recreated
    let input = wallet.getInput(transaction);

    $.ajax({
        type: "POST",
        url: this.url,
        data: {     
            stage: "transmitPartial", // signal the stage to the server
            input: JSON.stringify(input), // stringify since nested
            amount: this.form_data.amount,
            refund_tx: this.refundTransaction
        },
        success: function(data) {
            // reload the page, updated with new project progress
            window.location.reload(true);
            console.log("success");
        },
        error: displayError.bind(this.this_form),
        dataType: 'json'
    });
}

/**
 * Display error message to the user. Callback for ajax error handling. 
 * 
 * @param {object} jqXhr jquery XMLHttpRequest object
 * @param {object} jqXhr.responseJSON the response json
 */
function displayError(jqXhr) {
    let data = jqXhr.responseJSON;
    console.log("error", data.status, data.message);
    // append error message to the form
    let error_msg = $('<p>').addClass("text-danger error-message").text(`Error ${data.status}: ${data.message}`);
    var existing_messages = $(this).children('p.error-message');
    if (existing_messages.length == 0) {
        $(this).append(error_msg);
    } else {
        // if an error message already exists, replace it
        existing_messages.first().text(`Error ${data.status}: ${data.message}`);
    }
}