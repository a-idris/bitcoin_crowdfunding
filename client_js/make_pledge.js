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
 * @param {object} data 
 */
function createExactAmount(data) {
    let inputs = data;
    // convert the mnemonic to an xpriv key. this will be used for signing.
    let xpriv = keyutils.generateXpriv(this.form_data.mnemonic);
    let cookie = parseCookie();

    let transaction = wallet.createExactAmount(inputs, Number(this.form_data.amount), xpriv, Number(cookie.external_index), Number(cookie.change_index));
    // set the appropriate private key
    this.privateKey = keyutils.derive(xpriv, 'xpriv', `m/${cookie.external_index}`).privateKey;

    $.ajax({
        type: "POST",
        url: this.url,
        data: { 
            serialized_tx: transaction.serialize(), 
            stage: "transmitExactAmount"
        },
        success: data => {
            createPartial.call(this, transaction.toObject(), data)
        },
        error: displayError.bind(this.this_form),
        dataType: 'json'
    });

    // not necessary to chain createPartial after this? mb start processing straight away. async.

}

function createPartial(prevTransaction, outputInfo) {
    outputInfo.fund_goal = Number(outputInfo.fund_goal);
    let transaction = wallet.createPartial(prevTransaction, outputInfo, this.privateKey);

    $.ajax({
        type: "POST",
        url: this.url,
        data: {     
            stage: "transmitPartial"
        },
        success: function(data) {
            console.log("success");
        },
        error: displayError.bind(this.this_form),
        dataType: 'json'
    });
}

function displayError(jqXhr) {
    let data = jqXhr.responseJSON;
    console.log("error", data.status, data.message);
    let error_msg = $('<p>').addClass("text-danger error-message").text(`Error ${data.status}: ${data.message}`);
    var existing_messages = $(this).children('p.error-message');
    if (existing_messages.length == 0) {
        $(this).append(error_msg);
    } else {
        existing_messages.first().text(`Error ${data.status}: ${data.message}`);
    }
}

// params: scriptPubKey, seed, amount 
function craft_transaction() {
    //document.cookie.seed
    return {
        txid: "txid",
        vout: 1,
        signature: "signature"
    }
}