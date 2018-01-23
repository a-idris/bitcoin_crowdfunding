var express = require('express');
var router = express.Router();

/* GET home page. */
// list of projects, link to project.pug  
// users/:id
// users/:id/projects
// projects/create
// projects/:id
// projects/:id/edit
// projects/:id/delete

// controllers:
// users
// projects

var db = require('../src/database').get_db();
db.open().catch(error => console.log("error opening db"));

router.get('/', function (req, res, next) {
    let query_str = "select * from projects natural join users";
    db.query(query_str)
    .then(results => {
        // console.log(results.results);
        res.render('index', { title: '', projects: results });
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

module.exports = router;
