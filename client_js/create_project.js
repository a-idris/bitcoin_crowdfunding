const wallet = require('../src/key_management.js');

$(document).ready(function() {
    $('form#create_project').on('submit', function(event) {
        $("input[name='scriptPubKey']").val(generateScriptPubKey());        
    });
});

function generateScriptPubKey() {
    let cookie = parseCookie();
    var xpub = wallet.derive(cookie.xpub_key, `M/${cookie.external_index}`);
    // convert to address
    return wallet.getAddress(xpub).toString();
}

function parseCookie() {
    let cookieObj = {};
    document.cookie.split(";").map(pair => {
        pair = pair.split("=");
        cookieObj[pair[0].trim()] = pair[1];
    });
    return cookieObj;
}