$(document).ready(function() {
    $('form#create_project').on('submit', function(event) {
        //append hidden script pub key attribute to form data
        var scriptPubKeyInput = $("<input>").attr("type", "hidden").attr("name", "scriptPubKey").val(generateScriptPubKey());        
        $(this).append($(scriptPubKeyInput));
    });
});

function generateScriptPubKey() {
    return "scriptPubKey";
}