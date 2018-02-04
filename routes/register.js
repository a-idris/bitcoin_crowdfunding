const express = require('express');
const router = express.Router();

const bcrypt = require('bcrypt');
const db = require('../src/database').get_db();

router.get('/', function(req, res, next) {
    res.render('register', {title: 'register'});
});

router.post('/', function(req, res, next) {
    validate(req.body)
    .then(save_details)
    .then(user_id => {
        req.session.user_id = user_id;
        res.redirect(`/users/${user_id}`);
    })
    .catch(err => {
        res.redirect('/register?error=denied'); //pass req.params + json error message
    });
});

function validate(registration_details) {
    // nonempty
    if (!registration_details.username || !registration_details.password)
        return Promise.resolve(false);
    // user doesn't exist already
    let query_str = "select * from users where username=?";
    let validation_promise = db.query(query_str, [registration_details.username])
    .then(results => {
        console.log("dbresults", results);
        // return true if no results found
        if (!results.length) {
            return registration_details;
        } 
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
        return db.query(query_str, [registration_details.username, hash, "seed"]).then(results => results.insertId); 
    });
};



module.exports = router;
