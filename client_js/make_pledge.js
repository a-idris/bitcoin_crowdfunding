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
                var existing_messages = $(this_form).children('span.error-message');
                if (existing_messages.length == 0) {
                    $(this_form).append(error_msg);
                } else {
                    existing_messages.first().text(`Error ${data.status}: ${data.message}`);
                }
            }, 
            dataType: 'json'
        });

        // $.post(
        //     $(this).attr('action'), // use url from form
        //     transaction, 
        //     function(data, status) {
        //         console.log("DATA:", data);
        //         console.log("STATUS", status);
        //         if (data.status == 200) {
        //             location.reload();
        //         } else if (data.status >= 400) {
        //             let error_msg = $('<span>').addClass("text-danger", "error-message").val(data.message);
        //             var existing_messages = $(this).children('span.error-message');
        //             if (existing_messages.length == 0) {
        //                 $(this).append($(error_msg));
        //             } else {
        //                 existing_messages[0].val(data.message);
        //             }
        //         }
        //     }, 
        //     'json'
        // );
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