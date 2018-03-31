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
            data: context.form_data, 
            success: createExactAmount.bind(context), // bind context object to be used as 'this' 
            error: displayError.bind(context.this_form), // bind form context
            dataType: 'json'
        });
    });
});

/**
 * 
 * @param {object} data The JSON encoded tx inputs returned from the server
 */
function createExactAmount(data) {
    let inputs = data;
    // convert the mnemonic to an xpriv key. this will be used for signing.
    let xpriv = keyutils.generateXpriv(this.form_data.mnemonic);
    let cookie = parseCookie();

    // create a transaction that creates a UTXO with value equal to the exact amount 
    let transaction = wallet.createExactAmount(inputs, Number(this.form_data.amount), xpriv, Number(cookie.external_index), Number(cookie.change_index));
    // the transaction is sending the amount to the public key address at external_index. save the private key corresponding to this public key
    this.privateKey = keyutils.derive(xpriv, 'xpriv', `m/0/${cookie.external_index}`).privateKey;

    $.ajax({
        type: "POST",
        url: this.url, // the same url
        data: { 
            stage: "transmitExactAmount", // the next stage. the server will transmit the transaction
            serialized_tx: transaction.serialize() 
        },
        success: data => {
            // bind 'this' so that createPartial has access to the private key
            createPartial.call(this, transaction.toObject(), data)
        },
        error: displayError.bind(this.this_form),
        dataType: 'json'
    });

    // not necessary to chain createPartial after this? mb start processing straight away. async.

}

/**
 * 
 * @param {Transaction} prevTransaction The transaction created in {@link createExactAmount}
 * @param {object} outputInfo The project info
 * @param {string} outputInfo.address 
 * @param {number} outputInfo.fund_goal
 */
function createPartial(prevTransaction, outputInfo) {
    outputInfo.fund_goal = Number(outputInfo.fund_goal);
    // craft the final transaction, making the pledge of the exact amount to the project creator
    let transaction = wallet.createPartial(prevTransaction, outputInfo, this.privateKey);
    // just need the input of this transaction - the rest can be recreated
    let input = wallet.getInput(transaction);

    $.ajax({
        type: "POST",
        url: this.url,
        data: {     
            stage: "transmitPartial", // signal the stage to the server
            input: input 
        },
        success: function(data) {
            // reload? the page should be updated with new project progress
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


function displaySuccess(data) {

}