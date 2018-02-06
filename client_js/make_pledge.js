$(document).ready(function() {
    $('form#make_pledge').on('submit', function(event) {
        event.preventDefault();
        var this_form = this; 
        let amount = $(this_form).find('input[name=amount]').val();
        let transaction = craft_transaction();
        transaction.amount = amount;

        $.ajax({
            type: "POST",
            url: $(this_form).attr('action'), // use url from form
            data: transaction, 
            success: function(data) {
                console.log("success", data.status);
                location.reload();
            }, 
            error: function(jqXhr) {
                let data = jqXhr.responseJSON;
                console.log("error", data.status, data.message);
                let error_msg = $('<p>').addClass("text-danger error-message").text(`Error ${data.status}: ${data.message}`);
                var existing_messages = $(this_form).children('p.error-message');
                if (existing_messages.length == 0) {
                    $(this_form).append(error_msg);
                } else {
                    existing_messages.first().text(`Error ${data.status}: ${data.message}`);
                }
            }, 
            dataType: 'json'
        });
    });
});

// params: scriptPubKey, seed, amount 
function craft_transaction() {
    //document.cookie.seed
    return {
        txid: "txid",
        vout: 1,
        signature: "signature"
    }
}

function request_authorization() {
    // bootstrap popup. "Authorize the transaction with passphrase:"
}