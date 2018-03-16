/** 
 * Registration route module.
 * @module routes/register
 * @requires NPM:bcrypt
*/

const express = require('express');
const router = express.Router();

const bcrypt = require('bcrypt');
const db = require('../src/database').get_db();

/** 
 * Starting external index for new HD wallet. From BIP44 scheme.
 * @constant
 * @type {number} 
 * @default
*/
var EXTERNAL_INDEX = 0;

/** 
 * Starting change index for new HD wallet. From BIP44 scheme.
 * @constant
 * @type {number} 
 * @default
*/
var CHANGE_INDEX = 0;


/**
 * Display registration page.
 *
 * @name Get registration page
 * @route {GET} /register/
 */
router.get('/', function(req, res, next) {
    res.render('register', {title: 'register'});
});

/**
 * Validate input details. Save details to database. Initialise wallet indices and save to database, as well as setting them and xpub key as cookies. Set session variables; redirect to index.
 *
 * @name Process registration
 * @route {POST} /register/
 * @bodyparam {string} username
 * @bodyparam {string} password
 * @bodyparam {string} xpub_key The root extended public key to be used for address generation based on the BIP32 Hierarchical Deterministic wallet scheme.  
 */
router.post('/', function(req, res, next) {
    let transactionConnection;

    validate(req.body)
    .then(_ => {
        // begin transaction. The following SQL statements should be treated as an atomic unit of work to maintain database consistency and validity. 
        return db.begin_transaction().then(connection => {
            // save for easier access
            transactionConnection = connection;
            return;
        });
    })
    .then(_ => save_details(transactionConnection))
    .then(_ => init_wallet_indices(transactionConnection))
    .then(user_id => {
        // DELETE THIS on deploy. ONLY FOR TESTING
        let query_str = "insert into mnemonics values (NULL, ?, ?)";
        req.session.mnemonic = req.body.mnemonic;
        return db.query(query_str, [user_id, req.body.mnemonic], transactionConnection=transactionConnection).then(result => user_id);
    })
    .then(user_id => {
        req.session.user_id = user_id;
        // set cookies for xpub and the indices
        res.cookie('xpub_key', req.body.xpub_key);
        res.cookie('change_index', CHANGE_INDEX);
        res.cookie('external_index', EXTERNAL_INDEX);
        res.redirect(`/users/${user_id}`);
    })
    .catch(err => {
        console.log("registration error:", err);
        res.redirect('/register?error=denied'); //pass req.params + json error message
    });
});

function validate(registration_details) {
    // nonempty
    if (!registration_details.username || !registration_details.password || !registration_details.xpub_key)
        return Promise.reject(new Error("invalid input details"));
    // user doesn't exist already
    let query_str = "select * from users where username=?";
    let validation_promise = db.query(query_str, [registration_details.username])
    .then(results => {
        console.log("dbresults", results);
        // return false if clashing username else return the registration_details object back
        if (!results.length) {
            return registration_details;
        } 
        // todo: throw error + ajax
        return Promise.reject(new Error("Username already exists"));
    });
    return validation_promise;
}

function save_details(registration_details) {
    //generate hash w/ 10 salt rounds
    return bcrypt.hash(registration_details.password, 10)
    .then(hash => {
        //save to db 
        let query_str = "insert into users values (NULL, ?, ?, ?, now())";
        //return id of inserted row. will throw error if hasn't been inserted and trying to access insertId
        return db.query(query_str, [registration_details.username, hash, registration_details.xpub_key]).then(results => results.insertId); 
    });
};

function init_wallet_indices(user_id) {
    let query_str = "insert into hd_indices values (NULL, ?, ?, ?)";
    // todo check affected_rows and throw error accordingly
    return db.query(query_str, [user_id, CHANGE_INDEX, EXTERNAL_INDEX]).then(results => user_id);
}



module.exports = router;
