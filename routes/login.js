const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const db = require('../src/database').get_db();

router.get('/', function(req, res, next) {
    res.render('login', {title: 'login', session: req.session});
}); 

router.post('/', function(req, res, next) {
    //return json
    authenticate(req.body)
    .then(user_id => {
        if (user_id === false) {
            res.redirect('/login?error=denied');
        } else {
            req.session.user_id = user_id;
            res.redirect('/');
        }
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
}); 

function authenticate(login_details) {
    // is nonempty
    if (!login_details.username || !login_details.password)
        return Promise.resolve(false);
    // username exists
    let query_str = `select * from users where username=?`;
    let auth_promise = db.query(query_str, [login_details.username])
    .then(results => {
        if (!results.length) {
            return false;
        } else {
            return results[0];
        }
    })
    .then(user => {
        //password hash matches
        if (user && bcrypt.compare(login_details.password, user.password_hash)) {
            // return the id
            return user.user_id;
        }
        return false;
    });
    return auth_promise;
};

module.exports = router;
