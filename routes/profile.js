const express = require('express');
const router = express.Router();

const db = require('../src/database').get_db();

router.get('/', function(req, res, next) {
    if (req.session.user_id) {
        res.redirect(`${req.session.user_id}`);
    }
});

router.get('/:id', function(req, res, next) {
    let query_str = `select * from users where user_id=?`;
    db.query(query_str, [req.params.id])
    .then(results => {
        if (results[0]) {
            console.log(results[0]);
            res.render('profile', { title: 'profile', session: req.session, user: results[0] });          
        } else {
            next();
        }
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

router.get('/:id/settings', function(req, res, next) {
    // validate session id
});

module.exports = router;
