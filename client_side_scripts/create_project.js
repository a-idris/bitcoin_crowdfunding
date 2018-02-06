const wallet = require('/src/wallet_management.js')

$(document).ready(function() {
    $('form#create_project').on('submit', function(event) {
        event.preventDefault();
        //append hidden script pub key attribute to form data
        var scriptPubKeyInput = $("<input>").attr("type", "hidden").attr("name", "scriptPubKey").val(generateScriptPubKey());        
        $(this).append($(scriptPubKeyInput));
        $(this).submit();
    });
});

function generateScriptPubKey() {
    return "scriptPubKey";
}




