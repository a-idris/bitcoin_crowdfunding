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
        res.redirect('/login');
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
        db.query(query_str, [registration_details.username, hash, "seed"])
        .then(results => { 
            let project_id = results.insertId;
            res.redirect(`/projects/${project_id}`);
        }); 
    }
});

function validate_project_submission(submission) {
    return true;
}

router.get('/:id', function (req, res, next) {
    let project_id = req.params.id;
    let project, project_updates, project_comments; // objects to hold query results
    let query_str = "select * from projects natural join users where project_id=?";
    db.query(query_str, [project_id])
    .then(project_results => {
        if (!project_results[0]) {
            let err = new Error('Project not found');
            err.status = 404;
            return Promise.reject(err);
        }
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
            comments: project_comments
        });  
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});


router.get('/:id/delete', function (req, res, next) {
    let project_id = req.params.id;    
    assertAuthor(project_id, req.session.user_id)
    .then(_ => {
        let query_str = `delete from projects where project_id=?`;
        return db.query(query_str, [project_id]);
    })
    .then(delete_result => {
        // show toast, deleted successfully
        if (delete_result.affectedRows > 0) {
            res.redirect('/');
        } else {
            return Promise.reject(new Error('Delete operation failed'));
        }
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

// verify that creator of project_id is candidate_user_id
function assertAuthor(project_id, candidate_user_id) {
    let query_str = `select user_id from projects where project_id=?`;
    return db.query(query_str, [project_id])
    .then(results => {
        let user_id = results[0].user_id;
        if (!user_id) {
            // if no such project
            let err = new Error('Project not found');
            err.status = 404;
            return Promise.reject(err);
        } else if (user_id !== candidate_user_id) {
            // if session's user is not author 
            let err = new Error('Permission denied');
            err.status = 403;
            return Promise.reject(err);
        }
        // empty resolve
        return Promise.resolve();
    });
}


router.post('/:id/add_comment', function (req, res, next) {
    let project_id = req.params.id;
    Promise.resolve().then(_ => {
        if (validate_text(req.body.comment)) {
            let query_str = "insert into project_comments values (NULL, ?, ?, ?, now())";
            return db.query(query_str, [project_id, req.session.user_id, req.body.comment]);
        } else {
            let err = new Error("Invalid form data");
            err.status = 400;
            return Promise.reject(err);
        }
    })
    .then(results => {
        if (results.insertId) {
            res.redirect(`/projects/${project_id}`);
        } else {
            return Promise.reject(new Error('Insert operation failed'));            
        }
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

router.post('/:id/add_update', function (req, res, next) {
    let project_id = req.params.id;
    assertAuthor(project_id, req.session.user_id)
    .then(_ => {
        if (validate_text(req.body.update)) {
            let query_str = "insert into project_updates values (NULL, ?, ?, now())";
            return db.query(query_str, [project_id, req.body.update]);
        } else {
            let err = new Error("Invalid form data");
            err.status = 400;
            return Promise.reject(err);
        }
    })
    .then(results => {
        if (results.insertId) {
            res.redirect(`/projects/${project_id}`);
        } else {
            return Promise.reject(new Error('Insert operation failed'));            
        }
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

function validate_text(comment) {
    return true;
}

module.exports = router;
