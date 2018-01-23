const express = require('express');
const router = express.Router();

const db = require('../src/database').get_db();

router.get('/', function(req, res, next) {
    res.render('login', {title: 'login'});
}); 

router.post('/', function(req, res, next) {
    // db logic
    //return json
    authenticate(req.body)
    .then(result => {
        if (result === true) {
            res.redirect('/');
        } else if (result == false) {
            res.redirect('/login');
        }
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
}); 

function authenticate(login_details) {
    // nonempty
    if (!login_details.username || !login_details.password)
        return Promise.resolve(false);
    // user exists
    let query_str = `select * from users where username=?`;
    return db.query(query_str, [login_details.username])
    .then(results => {
        console.log("dbresults", results);
        if (!results.length) {
            console.log("no user");
            return false;
        } else {
            console.log("found user");
            return true;
        }
    })
;    // .then(_ => {
    //     // password matches

    // });
};

module.exports = router;
