/** 
 * Projects router module.
 * @module routes/projects
*/

const express = require('express');
const router = express.Router();

/** 
 * Database wrapper object.
 * @const {Database}
*/
const db = require('../src/database').get_db();
/** Blockchain querying API */
const blockchain = require('../src/api');
/** Wallet util functions */
const wallet = require('../src/wallet');


/**
 * Display form to create a project.
 *
 * @name Get Project Creation Page
 * @route {GET} /projects/create
 */
router.get('/create', function (req, res, next) {
    if (!req.session.user_id) {
        // need to be logged in to create a project
        res.redirect('/login');
    } else {
        res.render('create_project', {title: 'create project'});        
    }
});

/**
 * Validate, insert to PROJECTS, update hd_indices and update cookies.
 *
 * @name Process project submission
 * @route {POST} /projects/create
 * @bodyparam {string} title Title of the project
 * @bodyparam {string} short_description 
 * @bodyparam {string} description
 * @bodyparam {string} address The bitcoin address to which funds should be pledged
 * @bodyparam {string} fund_goal The fund goal amount, in bitcoin
 * @bodyparam {string} deadline The deadline by which this should be met. Date formatted string.
*/
router.post('/create', function (req, res, next) {
    if (!req.session.user_id) {
        // need to be logged in to create project
        res.redirect('/login');
    } 
    console.log(req.body);
    if (validate_create_project(req.body)) {
        // start transaction to insert details into projects table and update hd wallet indices
        let transactionConnection;
        db.begin_transaction()
        .then(connection => {
            // save for easier access
            transactionConnection = connection;
            // the initial amount_pledged is set to 0 in the query 
            let query_str = "insert into projects values (NULL, ?, ?, ?, ?, ?, ?, 0, now(), ?)";
            let values = [req.session.user_id, req.body.title, req.body.short_description, req.body.description, req.body.address, req.body.fund_goal, req.body.deadline];
            return db.query(query_str, values, {transactionConnection: transactionConnection});
        })
        .then(results => { 
            //returns id of inserted row. will throw error if hasn't been inserted and trying to access insertId
            let project_id = results.insertId;
            if (project_id) {
                /* since a new address has been generated at the current external index (stored in the db and cookie), 
                need to increment the external index by 1 to keep it updated. Propagate this change to database and cookies */
                let indices_to_set = { external_index: Number(req.cookies.external_index) + 1 }
                return update_hd_indices(req, res, indices_to_set, transactionConnection).then(success => {
                    // redirect to the page of the newly created project
                    res.redirect(`/projects/${project_id}`);
                });
            } else {
                return Promise.reject(new Error('Insert operation failed'));            
            }
        })
        .catch(error => {
            console.log(error);
            next(error); // 500 
        }); 
    } else {
        // if validation failed
        let err = new Error("Invalid form data");
        err.status = 400;
        next(err);
    }
});

/**
 * Check that expected properties are there, are nonempty, fund_goal is valid positive number, deadline is valid formatted date.
 * 
 * @param {object} submission 
 * @param {string} submission.title Title of the project
 * @param {string} submission.short_description 
 * @param {string} submission.description
 * @param {string} submission.address The bitcoin address to which funds should be pledged
 * @param {string} submission.fund_goal The fund goal amount, in bitcoin
 * @param {string} submission.deadline The deadline by which this should be met. Date formatted string.
 * 
 * @returns {boolean} 
 */
function validate_create_project(submission) {
    let expected_properties = ['title', 'short_description', 'description', 'address', 'fund_goal', 'deadline'];
    let submission_properties = Object.keys(submission);

    // check that all the expected properties exist
    if (!expected_properties.every(prop => submission_properties.indexOf(prop) >= 0))
        return false;
    
    function string_isvalid(candidate) {
        // check that trimmed string is nonempty
        return typeof candidate === 'string' && candidate.trim().length;
    }

    // check that strings are valid
    if (!submission_properties.all(string_isvalid)) {
        return false;
    }  

    // convert fund_goal to number
    submission.fund_goal = Number(submission.fund_goal);
    // must be valid number greater than 0
    if (isNaN(submission.fund_goal) || submission.fund_goal <= 0)
        return false;

    // check that deadline is valid Date
    let parsed_date = new Date(submission.deadline);
    if (parsed_date === 'Invalid Date' || isNan(parsed_date))
        return false;

    // all checks passed
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

router.post('/:id/make_pledge', function (req, res, next) {
    // TODO: make it a transaction

    if (!req.session.user_id) {
        res.status(403).json({
            status: 403,
            message: 'Must be logged in to perform this action'
        });
    } 

    let stage = req.body.stage;
    if (!stage) {
    // if (!req.body.hasOwnProperty("stage")) {
        generateInputs(req, res);
    } else if (stage == "transmitExactAmount") {
        transmitExactAmount(req, res);
    } else if (stage == "transmitPartial") {
        transmitPartial(req, res);
        //then(_ => {checkPledges(req,res)})
    }
});

function generateInputs(req, res) {
    if (!validate_pledge(req.body)) {
        res.status(400).json({ 
            status: 400,
            message: "Invalid form data" 
        });
    }
    
    blockchain.getbalance(req.cookies.xpub_key, function(err, balance) {
        if (err) {
            res.status(500).json({
                status: 500,
                message: err.message
            });
        } else if (req.body.amount > balance) {
            res.status(400).json({
                status: 400,
                message: "Insufficient funds"
            });
        } else {
            // craft transaction to have output with the exact amount
            blockchain.getunspent(req.cookies.xpub_key, function(err, utxos) {
                let inputs = wallet.chooseInputs(utxos, req.body.amount);
                // return the inputs to be created into a transaction
                res.json(inputs);
            });
        }
    });
}

/**
 * Updates the hd wallet indices (external index or change index) in the database
 * and cookies based on the provided values in the indices_to_set object.
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Object} indices_to_set 
 * @param {number} [indices_to_set.external_index] The new external index  
 * @param {number} [indices_to_set.change_index] The new change index
 * @param {Connection} transactionConnection To be passed when executing a transaction.
 *  
 * @returns {Promise.<undefined|Error>} promise that resolves to undefined if update is successful or rejects with any encountered Error
 */
function update_hd_indices(req, res, indices_to_set, transactionConnection) {
    let query_str = "update hd_indices set ";
    let attributes = Object.keys(indices_to_set);
    
    if (!attributes.length)
        return Promise.reject(new Error('Must provide indices options to set'));
    
    let values = attributes.map(key => indices_to_set[key]);
    // indices must be in range 0 - 2^32 by nature of HD wallets
    if (!values.every(val => val >= 0 && val < Math.pow(2, 32)))
        return Promise.reject(new Error('Invalid indices provided'));

    for (let attr of attributes) {
        query_str += `${attr}=?, `;
    }
    //remove trailing comma
    query_str = query_str.substring(0, query_str.length - 2);
    
    // update for the logged in user by session.user_id
    query_str += " where user_id=?";
    values.push(req.session.user_id);
    
    return db.query(query_str, values, {transactionConnection: transactionConnection})
    .then(results => {
        if (results.affectedRows == 1) {
            return db.commit(transactionConnection)
            .then(success => {
                // update cookies
                for (let attr of attributes) {
                    res.cookie(attr, indices_to_set[attr]);
                }
                return Promise.resolve();
            });
        } else {
            // if update failed, rollback the transaction
            return db.rollback(transactionConnection)
            .then(successful_rollback => {
                return Promise.reject(new Error('Update operation failed'));            
            }); 
        }
    });
}

function transmitExactAmount(req, res) {
    update_hd_indices(req, res, {
        external_index: Number(req.cookies.external_index) + 1,
        change_index: Number(req.cookies.change_index) + 1
    }).then(_ => {
        blockchain.sendtx(req.body.serialized_tx, function(err, response) {
            if (err) {
                console.log("post error", err);
                res.status(500).json(JSON.stringify(err));
            } else {
                // if success, pass the output info (address, amount) of this project back so the client can create the partial pledge transaction
                let query_str = "select address, fund_goal from projects where project_id=?";
                db.query(query_str, [req.params.id])
                .then(results => {
                    let project_details = results[0];
                    if (project_details) {
                        res.status(200).json(project_details);
                    } else {
                        return Promise.reject(new Error("retrieving project details failed"));
                    }
                });
            }
        });
    })
    .catch(err => {
        res.status(err.status || 500).json({ 
            status: err.status || 500,
            message: err.message 
        });
    }); 
}

function transmitPartial(req, res) {
    res.status(200).json({
        status: 200,
        message: "submitted"
    });
    return;

    if (validate_pledge(req.body)) {
        // amount, txid, vout, signature
        console.log("pledging", req.body);

        let project_id = req.params.id;
        let project;
        // get project info
        let query_str = "select * from projects where project_id=?";
        db.query(query_str, [project_id])
        .then(project_results => {
            project = project_results[0];
            if (!project) {
                let err = new Error("No such project");
                err.status= 400;
                return Promise.reject(err);
            }
            // insert into pledge inputs to get input_id  
            query_str = "insert into pledge_inputs values (NULL, ?, ?, ?)";
            var values = [ req.body.txid, req.body.vout, req.body.signature ];
            //return id of inserted row. will throw error if hasn't been inserted and trying to access insertId
            return db.query(query_str, values);
        })  
        .then(results => { 
            let input_id = results.insertId;
            if (input_id) {
                query_str = "insert into pledges values (NULL, ?, ?, ?, ?, now())";
                values = [ req.session.user_id, project_id, input_id, req.body.amount ] 
                return db.query(query_str, values);
            } else {
                return Promise.reject(new Error('Insert operation failed'));            
            }
        })
        .then(results => {
            let pledge_id = results.insertId;
            if (pledge_id) {
                // need time checks. 
                // update the amount_pledged for the project in the projects table
                let new_amount_pledged = project.amount_pledged + req.body.amount;
                query_str = "update projects set amount_pledged=? where project_id=?";
                values = [new_amount_pledged, project_id];
                return db.query(query_str, values);
            } else {
                return Promise.reject(new Error('Insert operation failed'));                            
            }
        })
        .then(results => {
            // check affectedRows attribute to see if the operation succeeded
            if (results.affectedRows == 1) {
                // need time checks. 
                res.status(200).json({ status: 200 });
                return;
            } else {
                return Promise.reject(new Error('Update operation failed'));
            }
        })
        .catch(error => {
            res.status(error.status || 500).json({ 
                status: error.status || 500,
                message: error.message 
            });
        }); 
    } else {
        res.status(400).json({ 
            status: 400,
            message: "Invalid form data" 
        });
    }
}

function validate_pledge(pledge) {
    // amount, txid, vout, signature
    //convert from strings to int
    pledge.amount = Number(pledge.amount);
    // pledge.vout = Number(pledge.vout);
    if (isNaN(pledge.amount)) {// || isNaN(pledge.vout)) {
        return false;
    }
    return true;
}

module.exports = router;
