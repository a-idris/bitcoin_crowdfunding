const express = require('express');
const router = express.Router();

const bcrypt = require('bcrypt');
const db = require('../src/database').get_db();

//constants. starting indices for a new HD wallet
var change_index = 0;
var external_index = 0;

router.get('/', function(req, res, next) {
    res.render('register', {title: 'register'});
});

router.post('/', function(req, res, next) {
    validate(req.body)
    .then(save_details)
    .then(init_wallet_indices)
    .then(user_id => {
        // DELETE THIS on deploy. ONLY FOR TESTING
        let query_str = "insert into mnemonics values (NULL, ?, ?)";
        req.session.mnemonic = req.body.mnemonic;
        return db.query(query_str, [user_id, req.body.mnemonic]).then(result => user_id);
    })
    .then(user_id => {
        req.session.user_id = user_id;
        // set cookies for xpub and the indices
        res.cookie('xpub_key', req.body.xpub_key);
        res.cookie('change_index', change_index);
        res.cookie('external_index', external_index);
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
        return Promise.resolve(false);
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
        return false;
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
    return db.query(query_str, [user_id, change_index, external_index]).then(results => user_id);
}



module.exports = router;
