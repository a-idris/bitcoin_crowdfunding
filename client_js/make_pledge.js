const wallet = require('../src/wallet');
const keyutils = require('../src/key_management');

$(document).ready(function() {
    $('form#make_pledge').on('submit', function(event) {
        event.preventDefault();
        
        let context = {};
        context.this_form = this;
        context.form_data = {
            amount: $(context.this_form).find('input[name=amount]').val(),
            mnemonic: $(context.this_form).find('input[name=mnemonic]').val()
        };
        context.url = $(context.this_form).attr('action'); // use url from form action

        $.ajax({
            type: "POST",
            url: context.url, 
            data: context.form_data, 
            success: createExactAmount.bind(context), 
            error: displayError.bind(context.this_form), // pass form context
            dataType: 'json'
        });
    });
});

function createExactAmount(data) {
    let inputs = data;
    let xpriv = keyutils.generateXpriv(this.form_data.mnemonic);
    let cookie = parseCookie();

    let transaction = wallet.createExactAmount(inputs, Number(this.form_data.amount), xpriv, Number(cookie.external_index), Number(cookie.change_index));
    $.ajax({
        type: "POST",
        url: this.url,
        data: { 
            serialized_tx: transaction, 
            stage: "transmitExactAmount"
        },
        success: createPartial.bind(this),
        error: displayError.bind(this.this_form),
        dataType: 'json'
    });

    // not necessary to chain createPartial after this? mb start processing straight away. async.

}

function createPartial(data) {
    //todo
    console.log("createPartial");

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

function parseCookie() {
    let cookieObj = {};
    document.cookie.split(";").map(pair => {
        pair = pair.split("=");
        cookieObj[pair[0].trim()] = pair[1];
    });
    return cookieObj;
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