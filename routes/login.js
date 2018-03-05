const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const db = require('../src/database').get_db();

router.get('/', function(req, res, next) {
    res.render('login', {title: 'login'});
}); 

router.post('/', function(req, res, next) {
    //return json
    authenticate(req.body)
    .then(user => {
        if (user === false) {
            res.redirect('/login?error=denied');
        } else {
            let query_str = "select * from hd_indices where user_id=?";        
            return db.query(query_str, [user.user_id]).then(results => {
                let indices = results[0];
                if (indices) {
                    res.cookie('xpub_key', user.xpub_key);
                    res.cookie('change_index', indices.change_index);
                    res.cookie('external_index', indices.external_index);
                    // pass along the user_id
                    return user.user_id;
                }  
            });
        }
    })
    .then(user_id => {
        // DELETE THIS on deploy. ONLY FOR TESTING
        let query_str = "select * from mnemonics where user_id=?";
        return db.query(query_str, [user_id]).then(results => {
            req.session.mnemonic = results[0].mnemonic;
            return user_id;
        });
    })
    .then(user_id => {
        req.session.user_id = user_id;
        res.redirect('/');
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
            // return the user details
            return user;
        }
        return false;
    });
    return auth_promise;
};

module.exports = router;
