/** 
 * Users router module.
 * @module routes/users
*/

const express = require('express');
const router = express.Router();
/** 
 * Database wrapper object.
 * @const
 * @type {Database}
*/
const db = require('../src/database').get_db();
/** 
 * Blockchain querying API
*/
const blockchain = require('../src/api');
const wallet = require('../src/wallet');

/**
 * Display a list of the registered users.
 *
 * @name List of Users
 * @route {GET} /users/
 */
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

/**
 * Display the appropriate user's profile, replete with their info, list of their created projects,
 * and if it is the user's own profile show their pledges, wallet balance. The lists are limited to n entries,
 * with links to the /users/projects and /users/pledges routes.
 *
 * @name User Profile
 * @route {GET} /users/:id
 * @routeparam {string} :id the unique user id
 */
router.get('/:id', function(req, res, next) {
    let user_id = Number(req.params.id);
    let user, user_projects, user_pledges;
    let query_str = "select * from users where user_id=?";
    db.query(query_str, [user_id])
    .then(user_results => {
        user = user_results[0];
        if (user) {
            // get 4 latest projects created by the user
            query_str = "select * from projects where user_id=? order by date_added desc limit 4"
            return db.query(query_str, [user_id]);
        } else {
            let err = new Error('User not found');
            err.status = 404;
            return Promise.reject(err);
        }      
    })
    .then(project_results => {
        user_projects = wallet.convertToBtc(project_results, ["amount_pledged", "fund_goal"]);
        
        // only display the personal pledges to the logged in user
        if (req.session && req.session.user_id === user_id) {
            // get the projects' information for which there are pledges by the user (including information on the proejct creators)
            query_str = "select * \
                        from pledges join projects on pledges.project_id = projects.project_id \
                        join users on projects.user_id = users.user_id \
                        where pledges.user_id=? \
                        limit 4";
            return db.query(query_str, [user_id]);
        } else {
            // just resolve to null 
            return Promise.resolve(null);
        }
    })
    .then(pledge_results => {
        user_pledges = wallet.convertToBtc(pledge_results, ["amount", "amount_pledged", "fund_goal"]);

        if (req.session && req.session.user_id === user_id) {
            // query the wallet balance info for the user if viewing own profile
            blockchain.getBalance(req.cookies.xpub_key)
            .then(balance => {
                walletInfo = {
                    balance: wallet.toBtc(balance)
                };

                res.render('profile', { 
                    title: 'profile',
                    user: user,
                    projects: user_projects,
                    pledges: user_pledges,
                    wallet: walletInfo
                });    
            });
        } else {
            res.render('profile', { 
                title: 'profile',
                user: user,
                projects: user_projects,
            });    
        }
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

/**
 *  Display all the projects submitted by a user. 
 *
 * @name User Projects
 * @route {GET} /users/:id/projects
 * @routeparam {string} :id the unique user_id of the user whose projects to display 
 */
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
        user_projects = wallet.convertToBtc(project_results, ["amount_pledged", "fund_goal"]);
        
        res.render('user_projects', { 
            title: 'projects',
            user: user,
            projects: user_projects
        });    
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

/**
 * Display all the pledges made by the user. Specifically, display the information about the projects to 
 * which the pledges were made. 
 * 
 * @name User Pledges
 * @route {GET} /users/:id/pledges
 * @routeparam {string} :id the unique user id of the user whose pledges to display 
 */
router.get('/:id/pledges', function(req, res, next) {
    let user_id = req.params.id;

    // only the user can access own pledges 
    if (req.session.user_id != user_id) {
        res.redirect('/');
    }

    let query_str = "select * \
                    from pledges join projects on pledges.project_id = projects.project_id \
                    join users on projects.user_id = users.user_id \
                    where pledges.user_id=?";
    db.query(query_str, [user_id])
    .then(user_pledges => {
        res.render('user_pledges', { 
            title: 'pledges',
            pledges: wallet.convertToBtc(user_pledges, ["amount", "amount_pledged", "fund_goal"])
        });    
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});


// router.get('/:id/settings', function(req, res, next) {
//     // validate session id
// });

module.exports = router;
