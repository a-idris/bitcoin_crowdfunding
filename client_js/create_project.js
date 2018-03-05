const keyutils = require('../src/key_management.js');

$(document).ready(function() {
    $('form#create_project').on('submit', function(event) {
        $("input[name='address']").val(generateAddress());        
    });
});

function generateAddress() {
    let cookie = parseCookie();
    var xpub = keyutils.derive(cookie.xpub_key, 'xpub', `M/${cookie.external_index}`);
    // convert to address
    return keyutils.getAddress(xpub).toString();
}

function parseCookie() {
    let cookieObj = {};
    document.cookie.split(";").map(pair => {
        pair = pair.split("=");
        cookieObj[pair[0].trim()] = pair[1];
    });
    return cookieObj;
}