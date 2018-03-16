/** 
 * Logout route module.
 * @module routes/logout
*/

const express = require('express');
const router = express.Router();

/**
 * Destroy the session, clear wallet specific cookies and redirect home 
 *
 * @name Process log out
 * @route {GET} /logout/
 */
router.get('/', function(req, res, next) {
    // destroy the session
    req.session = null;
    // clear cookies
    res.clearCookie('xpub_key')
    res.clearCookie('change_index')
    res.clearCookie('external_index')
    // redirect home
    res.redirect('/');
});

module.exports = router;