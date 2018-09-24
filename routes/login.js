/** 
 * Login route module.
 * @module routes/login
 * @requires NPM:bcrypt
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

/** 
 * Database wrapper object.
 * @type {Database}
*/
const db = require('../src/database').get_db();

/**
 * Display login page.
 *
 * @name Get login page
 * @route {GET} /login/
 */
router.get('/', function(req, res, next) {
    res.render('login', {title: 'login'});
}); 

/**
 * Authenticates details; loads hd_indices and xpub key as cookies; sets session variables; redirects to index.
 *
 * @name Process login attempt
 * @route {POST} /login/
 * @bodyparam {string} username
 * @bodyparam {string} password
 */
router.post('/', function(req, res, next) {
    //return json
    authenticate(req.body)
    //.catch(error => console.log)
    .then(user => {
        // set the appropriate hd wallet indices so that addresses are used only once. use cookies for client side access, since transaction crafting done on client side
        let query_str = "select * from hd_indices where user_id=?";        
        return db.query(query_str, [user.user_id]).then(results => {
            let indices = results[0];
            if (indices) {
                // set xpub_key as cookie so user can create transaction to make project on client side
                res.cookie('xpub_key', user.xpub_key);
                res.cookie('change_index', indices.change_index);
                res.cookie('external_index', indices.external_index);
                // pass along the user_id
                return user.user_id;
            }  
        });
    })
    .then(user_id => {
        req.session.user_id = user_id;
        res.redirect('/');
    })
    .catch(error => {
        // res.redirect('/login?error=denied');
        console.log(error);
        next(error); // 500 
    });
}); 

/**
 * Will check for the expected properties on login_details. Check that user with that username exists, and then verify the password hash matches.  
 * 
 * @param {object} login_details 
 * @param {string} login_details.username
 * @param {string} login_details.password
 * 
 * @returns {Promise.<object|Error>} A promise that returns a user object if resolved, or an Error if rejected.
 */
function authenticate(login_details) {
    // is nonempty
    if (!login_details.username || !login_details.password)
        return Promise.reject(new Error("invalid input details"));
    // username exists
    let query_str = `select * from users where username=?`;
    let auth_promise = db.query(query_str, [login_details.username])
    .then(results => {
        if (!results.length) {
            return Promise.reject(new Error("invalid input details"));
        } else {
            // return matching user details
            return results[0];
        }
    })
    .then(user => {
        //password hash matches
        if (user && bcrypt.compare(login_details.password, user.password_hash)) {
            // return the user details
            return user;
        }
        return Promise.reject(new Error("invalid input details"));
    });
    return auth_promise;
};

module.exports = router;
