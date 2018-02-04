var express = require('express');
var router = express.Router();

// projects/create
// projects/:id
// projects/:id/edit
// projects/:id/delete

var db = require('../src/database').get_db();

//project creation routes
router.get('/create', function (req, res, next) {
    if (!req.session.user_id) {
        res.redirect('/');
    } else {
        res.render('create_project', {title: 'create project'});        
    }
});

router.post('/create', function (req, res, next) {
    if (!req.session.user_id) {
        res.redirect('/');
    } 
    
    if (validate_project_submission(req.body)) {
        let query_str = "insert into projects values (NULL, ?, ?, ?, ?, ?, ?, 0, now(), ?)";
        values = [req.body.user_id, req.body.title, req.body.short_description, req.body.description, req.body.scriptPubKey, req.body.fund_goal, req.body.deadline];
        //return id of inserted row. will throw error if hasn't been inserted and trying to access insertId
        return db.query(query_str, [registration_details.username, hash, "seed"]).then(results => results.insertId); 
    }
});

function validate_project_submission(submission) {
    
}

router.get('/:id', function (req, res, next) {
    let project_id = req.params.id;
    let project, project_updates, project_comments; // objects to hold query results
    let query_str = "select * from projects natural join users where project_id=?";
    db.query(query_str, [project_id])
    .then(project_results => {
        project = project_results[0];
        query_str = "select * from project_updates where project_id=?";
        return db.query(query_str, [project_id]);         
    })
    .then(updates_results => {
        project_updates = updates_results;
        query_str = "select * from project_comments natural join users where project_id=?";
        return db.query(query_str, [project_id]);
    })
    .then(comment_results => {
        project_comments = comment_results;
        res.render('project', { 
            title: 'project', 
            project: project, 
            updates: project_updates,
            comments: project_comments,
            session: req.session
        });  
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

router.post('/:id/edit', function (req, res, next) {
    // parse body. add to updates. 
    
});

router.post('/:id/add_comment', function (req, res, next) {
    // parse body. add to comments.
    console.log("adding comment", req.body.comment);
});

router.delete('/:id', function (req, res, next) {
    let query_str = `delete from projects where project_id=?`;
    db.query(query_str, [req.params.id])
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
