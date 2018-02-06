const express = require('express');
const router = express.Router();

// controllers:
// users
// projects

var db = require('../src/database').get_db();
db.open().catch(error => console.log("error opening db"));

router.get('/', function (req, res, next) {
    let query_str = "select * from projects natural join users";
    db.query(query_str)
    .then(results => {
        res.render('index', { title: '', session: req.session, projects: results });
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

module.exports = router;
