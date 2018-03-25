/** 
 * Client side code for /projects/create page. Bundled to /public/js/bundle/create_project.js
 * @module client_js/create_project
 * @requires module:src/key_management
 * */

const keyutils = require('../src/key_management.js');

/**
 * Sets address hidden field through {@link generateAddress} when form submit event fires.
 * 
 * @callback onReadyCallback
 */
$(document).ready(function() {
    $('form#create_project').on('submit', function(event) {
        $("input[name='address']").val(generateAddress());        
    });
});

/** 
 * Generate a new address based on the xpub_key and external_index stored in the cookie.
 * 
 * @returns {string} Address Valid bitcoin address  
*/
function generateAddress() {
    let cookie = parseCookie();
    var xpub = keyutils.derive(cookie.xpub_key, 'xpub', `M/${cookie.external_index}`);
    // convert to address
    return keyutils.getAddress(xpub).toString();
}

/** 
 * Function to parse cookie into object
 * 
 * @returns {object} Cookie
*/
function parseCookie() {
    let cookieObj = {};
    document.cookie.split(";").map(pair => {
        pair = pair.split("=");
        cookieObj[pair[0].trim()] = pair[1];
    });
    return cookieObj;
}