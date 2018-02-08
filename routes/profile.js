const express = require('express');
const router = express.Router();

const db = require('../src/database').get_db();

// list of users
router.get('/', function(req, res, next) {
    let query_str = "select * from users";
    db.query(query_str)
    .then(results => {
        res.render('users', {title: 'users', users: results});
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

// specific users
router.get('/:id', function(req, res, next) {
    let user_id = req.params.id;
    let user, user_projects, user_pledges;
    let query_str = "select * from users where user_id=?";
    db.query(query_str, [user_id])
    .then(user_results => {
        user = user_results[0];
        if (user) {
            // get 5 latest projects
            query_str = "select * from projects where user_id=? order by date_added desc limit 3"
            return db.query(query_str, [user_id]);
        } else {
            let err = new Error('User not found');
            err.status = 404;
            return Promise.reject(err);
        }      
    })
    .then(project_results => {
        user_projects = project_results;
        // only display the personal pledges to the logged in user
        if (req.session && req.session.user_id == user_id) {
            query_str = "select * from pledges where user_id=?";
            return db.query(query_str, [user_id]);
        } else {
            return Promise.resolve(null);
        }
    })
    .then(pledge_results => {
        user_pledges = pledge_results;
        console.log("pledges", user_pledges, Boolean(user_pledges));
        res.render('profile', { 
            title: 'profile',
            user: user,
            projects: user_projects,
            pledges: user_pledges
        });    
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

// get all the projects submitted by a user
router.get('/:id/projects', function(req, res, next) {
    let user_id = req.params.id;
    let user, user_projects;
    let query_str = "select * from users where user_id=?";
    db.query(query_str, [user_id])
    .then(user_results => {
        user = user_results[0];
        if (user) {
            query_str = "select * from projects where user_id=? order by date_added desc"
            return db.query(query_str, [user_id]);
        } else {
            return Promise.reject(new Error('User not found'));
        }      
    })
    .then(project_results => {
        user_projects = project_results;
        res.render('user_projects', { 
            title: 'profile',
            session: req.session, 
            user: user,
            projects: user_projects
        });    
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
