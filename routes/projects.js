var express = require('express');
var router = express.Router();

// projects/create
// projects/:id
// projects/:id/edit
// projects/:id/delete

var db = require('../src/database').get_db();

router.get('/:id', function (req, res, next) {
    let query_str = `select * from projects natural join users where project_id=${req.params.id}`;
    db.query(query_str)
    .then(results => {
        res.render('project', { title: 'project', project: results.results[0] });
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

router.post('/:id/edit', function (req, res, next) {
    // parse body. add to updates. 
    let query_str = `select * from projects natural join users where project_id=${req.params.id}`;
    db.query(query_str)
    .then(results => {
        console.log(results.results);
        res.render('project', { title: 'project', project: results.results });
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

router.post('/:id/add_comment', function (req, res, next) {
    // parse body. add to comments.
    console.log("adding comment", req.body.comment);
});

router.delete('/:id', function (req, res, next) {
    let query_str = `delete from projects where project_id=${req.params.id}`;
    db.query(query_str)
    .then(results => {
        console.log(results.results);
        // show toast, deleted successfully
        res.redirect('/');
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

module.exports = router;
