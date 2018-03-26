/** 
 * Utility functions to be used on the client side.
 * @fileOverview
 */

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