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
const crypto = require('crypto');
const scheduler = require('../src/schedule');
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
 * Validate, insert to PROJECTS, update hd_indices because of the newly generated address and update cookies.
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
        //create secret token for the project to be used when unlocking the pledge inputs. 
        let secretToken = crypto.randomBytes(64).toString('hex');
        console.log("TOKEN", secretToken.length, "==", secretToken);

        // start transaction to insert details into projects table and update hd wallet indices
        let transactionConnection;
        db.begin_transaction()
        .then(connection => {
            // save for easier access
            transactionConnection = connection;
            let satoshiFundGoal = wallet.toSatoshis(req.body.fund_goal);
            // the initial amount_pledged is set to 0 in the query 
            let query_str = "insert into projects values (NULL, ?, ?, ?, ?, ?, ?, 0, now(), ?, ?)";
            let values = [req.session.user_id, req.body.title, req.body.short_description, req.body.description, req.body.address, satoshiFundGoal, req.body.deadline, secretToken];
            return db.query(query_str, values, {transactionConnection: transactionConnection});
        })
        .then(results => { 
            //returns id of inserted row. will throw error if hasn't been inserted and trying to access insertId
            let project_id = results.insertId;
            if (project_id) {
                /* since a new address has been generated at the current external index (stored in the db and cookie), 
                need to increment the external index by 1 to keep it updated. Propagate this change to database and cookies */
                let indices_to_set = { external_index: Number(req.cookies.external_index) + 1 }
                return update_hd_indices(req, res, indices_to_set, transactionConnection)
                .then(success => {
                    // commit the transaction and only if successful update the cookies
                    return db.commit(transactionConnection)
                    .then(success => {
                        // update cookies
                        for (let attr of Object.keys(indices_to_set)) {
                            res.cookie(attr, indices_to_set[attr]);
                        }
                        
                        // redirect to the page of the newly created project
                        res.redirect(`/projects/${project_id}`);
                    });
                });
            } else {
                return Promise.reject(new Error('Insert operation failed'));            
            }
        })
        .catch(error => {
            console.log(error);
            // forward to error handling middleware        
            next(error); 
        }); 
    } else {
        // if validation failed
        let err = new Error("Invalid form data");
        err.status = 400;
        // forward to error handling middleware        
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

    // check that strings are valid
    if (!submission_properties.every(key => validate_text(submission[key]))) {
        return false;
    }  

    // convert fund_goal to number
    submission.fund_goal = Number(submission.fund_goal);
    // must be valid number greater than 0
    if (isNaN(submission.fund_goal) || submission.fund_goal <= 0)
        return false;

    // check that deadline is valid Date
    let parsed_date = new Date(submission.deadline);
    if (parsed_date === 'Invalid Date' || isNaN(parsed_date))
        return false;

    // check that deadline is in the future
    // if (parsed_date.getTime() < Date.now()) 
    //     return false;

    // all checks passed
    return true;
}

/**
 * Display the project page, including the project information, progress, updates and comments. Will also contain methods to make pledge from there. 
 *
 * @name Get Project Page
 * @route {GET} /projects/:id
 * @routeparam {string} :id the unique project id
 */
router.get('/:id', function (req, res, next) {
    let project_id = req.params.id;
    // objects to hold query results
    let project, project_updates, project_comments;
    // join on user_id with users table to include the information of the project creator   
    let query_str = "select * from projects natural join users where project_id=?";
    db.query(query_str, [project_id])
    .then(project_results => {
        project = wallet.convertToBtc(project_results, ["amount_pledged", "fund_goal"])[0];
        if (!project) {
            let err = new Error('Project not found');
            err.status = 404;
            return Promise.reject(err);
        }
        // fetch the project updates made by the creator
        query_str = "select * from project_updates where project_id=?";
        return db.query(query_str, [project_id]);         
    })
    .then(updates_results => {
        project_updates = updates_results;
        // fetch the comments on the project. join on users table to hook into commenter's info
        query_str = "select * from project_comments natural join users where project_id=?";
        return db.query(query_str, [project_id]);
    })
    .then(project_comments => {
        res.render('project', { 
            title: 'project', 
            project: project, 
            updates: project_updates,
            comments: project_comments
        });  
    })
    .catch(error => {
        console.log(error);
        next(error); 
    });
});

/**
 * Delete the project page. First, authenticates the user as project creator through session user_id. 
 *
 * @name Delete Project Page
 * @route {GET} /projects/:id/delete
 * @routeparam {string} :id the unique project id
 */
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
        next(error); 
    });
});

/** 
 * Checks if creator of the project with project_id is candidate_user_id 
 * 
 * @param {number} project_id The id of the project to be deleted
 * @param {number} candidate_user_id The user_id to check if it is the author of the project
 * @returns {Promise.<undefined|Error>} promise that resolves / rejects based on match / mismatch of the candid_user_id with the actual creator's user_d.
*/
function assertAuthor(project_id, candidate_user_id) {
    // retrieve the user_id of the project creator
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
            // if candidate user_id is not author 
            let err = new Error('Permission denied');
            err.status = 403;
            return Promise.reject(err);
        }
        // empty resolve
        return Promise.resolve();
    });
}

/**
 * Validate form, insert the comment into the database, refresh the page if successful.  
 *
 * @name Process comment submission
 * @route {POST} /projects/:id/add_comment
 * @routeparam {string} :id the unique project id
 * @bodyparam {string} comment The comment text
*/
router.post('/:id/add_comment', function (req, res, next) {
    let project_id = req.params.id;

    if (!validate_text(req.body.comment)) {
        let err = new Error("Invalid form data");
        err.status = 400;
        // forward to error handling middleware
        next(err);
    }

    let query_str = "insert into project_comments values (NULL, ?, ?, ?, now())";
    return db.query(query_str, [project_id, req.session.user_id, req.body.comment])
    .then(results => {
        // if successful, will return the comment_id as insertId
        if (results.insertId) {
            // reload
            res.redirect(`/projects/${project_id}`);
        } else {
            return Promise.reject(new Error('Comment insert operation failed'));            
        }
    })
    .catch(error => {
        console.log(error);
        // forward to error handling middleware
        next(error); // 500 
    });
});

/**
 * Validate form, assert that only author can add updates, insert the update into the database, 
 * refresh the page if successful.  
 *
 * @name Process update submission
 * @route {POST} /projects/:id/add_update
 * @routeparam {string} :id the unique project id
 * @bodyparam {string} update The comment text
 */
router.post('/:id/add_update', function (req, res, next) {
    let project_id = req.params.id;
    // assert that session.user_id matches the project creator's user_id
    assertAuthor(project_id, req.session.user_id)
    .then(success => {
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
        // if successful, will return the update_id as insertId
        if (results.insertId) {
            // reload to show changes
            res.redirect(`/projects/${project_id}`);
        } else {
            return Promise.reject(new Error('Insert operation failed'));            
        }
    })
    .catch(error => {
        console.log(error);
        next(error); 
    });
});

/**
 * Function to validate text string. Used for user input.
 * @param {string} text
 * @returns {boolean} 
 */
function validate_text(text) {
    // check that trimmed string is nonempty
    return typeof text == 'string' && text.trim().length;
}

/**
 * Three stages for server side:
 * generate the inputs, transmit the transaction creating the exact amount output, process the partial 
 * transaction. Store the partial transaction in database. If the fund_goal is met with this pledge contribution,
 * craft the overall transaction and transmit it to the Bitcoin network. 
 * 
 * Validate form, process the pledge. Multiple client server interactions are needed, since the transaction
 * crafting is done on the client side while other parts need to be server side.
 * The initial stage is handled by {@link generateInputs}, where once a user wants to make a pledge 
 * the server side checks their wallet balance funds for sufficient funds to cover the desired amount. 
 * The assurance contract protocol necessitates that the partial transaction have as input an output with
 * the exact amount (since can't use change output address, because the outputs for all the partial pledge 
 * transactions to a project must remain constant). So once the client receives
 *
 * @name Process pledge
 * @route {POST} /projects/:id/make_pledge
 * @routeparam {string} :id the unique project id
 * @bodyparam {string} amount The comment text
 */
router.post('/:id/make_pledge', function (req, res, next) {

    if (!req.session.user_id) {
        res.status(403).json({
            status: 403,
            message: 'Must be logged in to perform this action'
        });
    }
    
    // get project info
    let query_str = "select * from projects where project_id=?";
    db.query(query_str, [req.params.id])
    .then(results => {
        let project = results[0];
        if (!project) {
            return Promise.reject(new Error("retrieving project details failed"));
        } 

        // return error if deadline has passed
        let deadlineUnix = new Date(project.deadline).getTime();
        if (deadlineUnix < Date.now()) 
            // return Promise.reject(new Error("deadline has passed"));

        // return error if the fund goal has already been reached
        if (project.amount_pledged > project.fund_goal)
            return Promise.reject(new Error("the campaign has already ended with the fund goal reached."));

        // need multiple client server interactions for this route, so use a body parameter to keep track
        let stage = req.body.stage || "initial";
        console.log(`STAGE: ${stage}`);
        if (stage === "initial") {
            /* the initial stage. check that the user has sufficient funds for the pledge amount, and if so
            return a list of UTXOs. These will be the inputs for the transaction to create an output that
            has exactly the correct amount 
            */ 
            generateInputs(req, res, project);
        } else if (stage === "transmitExactAmount") {
            transmitExactAmount(req, res, project);
        } else if (stage === "transmitPartial") {
            transmitPartial(req, res, project);
            //then(_ => {checkPledges(req,res)})
        }
    })
    .catch(err => send_json_error(res, err));
});

/**
 * Check balance of user and if everything is valid, using the res object, return a 
 * JSON encoded list of wallet UTXOs, whose sum amount is sufficient to cover the pledge amount. 
 * Otherwise send error. Responses are sent as JSON for the client side to handle.  
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @bodyparam {number} amount The req.body.amount property used to check whether the wallet has sufficient funds
 */
function generateInputs(req, res, project) {
    if (!validate_make_pledge(req.body, {stage: 'initial'})) {
        return res.status(400).json({ 
            status: 400,
            message: "Invalid form data" 
        });
    }
    
    // query the balance of the extended public key which is stored in the cookie
    blockchain.getBalance(req.cookies.xpub_key)
    .then(balance => {
        // send responses as json for the client to handle
        if (req.body.amount > balance + wallet.getMinFeeEstimate()) {
            // must have funds greater than the pledge amount
            return res.status(400).json({
                status: 400,
                message: `Insufficient funds. Balance on wallet is ${balance}`
            });
        } else {
            // get all the UTXOs from addresses derived from the xpub key 
            return blockchain.getUnspent(req.cookies.xpub_key);
        }
    })
    .then(utxos => {
        // choose a subset of these UTXOs that cover the amount needed  
        let inputs = wallet.chooseInputs(utxos, req.body.amount);
        // send the hash of the secret to be included in the locking script
        let secretToken = Buffer.from(project.token, 'hex');
        let tokenHash = wallet.hash160(secretToken, true);
        // return the inputs to be created into a transaction
        res.json({
            inputs: inputs,
            secretHash: tokenHash,
            deadline: project.deadline
        });
    })
    .catch(err => send_json_error(res, err));
}

/**
 * Transmit the transaction creating the exact amount, update hd_indices. If successful,
 * return the bitcoin address and fund goal of the project (for which the pledge is being made)
 * so the client can create the partial pledge transaction. Responses sent as JSON for the client side to handle.  
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
function transmitExactAmount(req, res, project) {
    // the transaction generated will have two outputs, with one external address and one change address. thus wil need to increment accordingly
    let indices_to_set = {
        external_index: Number(req.cookies.external_index) + 2,
        change_index: Number(req.cookies.change_index) + 1
    }

    blockchain.sendTx(req.body.serialized_tx)
    .then(response => {
        if (response.status !== 200) {
            let err = new Error(response.message);
            err.status = response.status;
            throw err;
        }
        update_hd_indices(req, res, indices_to_set);
    })
    .then(_ => {
        // if successful, update cookies. if failes, cookies aren't updated. keeps db indices and cookie indices in sync
        // if sendTx success but update_hd_indices fails, the addresses will be reused again.
        // however, this happening on occasion is better than having out of sync hd_indices info in db and cookies 
        for (let attr of Object.keys(indices_to_set)) {
            res.cookie(attr, indices_to_set[attr]);
        }

        // pass the output info (address, amount) of this project back so the client can create the partial pledge transaction
        res.status(200).json({
            address: project.address,
            fund_goal: project.fund_goal,
            secret: project.token
        });
    })
    .catch(err => send_json_error(res, err)); 
}

/**
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
function transmitPartial(req, res, project) {
    let txInput = JSON.parse(req.body.input);
    let pledge_amount = Number(req.body.amount); // the amount being pledged.
    let refundTransaction = req.body.refund_tx;

    if (!validate_make_pledge(txInput, {stage: 'transmitPartial'})) {
        return res.status(400).json({ 
            status: 400,
            message: "Malformed transaction input received" 
        });
    }

    //schedule the refund transaction transmission
    scheduler.scheduleRefund(refundTransaction, project.deadline);

    //console.log("pledging", req.body);
    let project_id = req.params.id;
    let transactionConnection; // will need to use a transaction

    db.begin_transaction()
    .then(connection => {
        // save the connection to be used for the transaction
        transactionConnection = connection;
        // create pledge entry in the db
        query_str = "insert into pledges values (NULL, ?, ?, ?, now(), ?)";
        var values = [ req.session.user_id, project_id, pledge_amount, refundTransaction ]; 
        //returns pledge_id of inserted row
        return db.query(query_str, values, {transactionConnection: transactionConnection});
    })  
    .then(results => { 
        let pledge_id = results.insertId;
        if (pledge_id) {
            // insert the input object itself into pledge_inputs table   
            query_str = "insert into pledge_inputs values (NULL, ?, ?, ?, ?, ?, ?, ?)";
            values = [ pledge_id, txInput.prevTxId, txInput.outputIndex, txInput.sequenceNumber, txInput.script, txInput.output.satoshis, txInput.output.script];
            return db.query(query_str, values, {transactionConnection: transactionConnection});
        } else {
            // roll back the transaction if something went wrong
            return db.rollback(transactionConnection).then(rollback_success => {
                return Promise.reject(new Error('Insert operation failed'));            
            });
        }
    })
    .then(results => {
        let input_id = results.insertId;
        if (input_id) {
            // update the amount_pledged for the project in the projects table
            let new_amount_pledged = Number(project.amount_pledged) + pledge_amount;
            query_str = "update projects set amount_pledged=? where project_id=?";
            values = [new_amount_pledged, project_id];
            return db.query(query_str, values, {transactionConnection: transactionConnection});
        } else {
            // roll back the transaction if something went wrong
            return db.rollback(transactionConnection).then(rollback_success => {
                return Promise.reject(new Error('Insert operation failed'));            
            });                                        
        }
    })
    .then(results => {
        // check affectedRows attribute to see if the operation succeeded
        if (results.affectedRows === 1) {
            // commit the transaction
            return db.commit(transactionConnection).then(commitSuccess => {
                console.log("partial Transaction success");
                // res.status(200).json({ status: 200 });
                return compilePartialTransaction(project_id);
            });
        } else {
            return Promise.reject(new Error('Update operation failed'));
        }
    })
    .then(finished => {
        let message = finished ? "combined transaction send" : "fund_goal not reached";
        console.log(message);
        res.status(200).json({ status: 200 });
    })
    // .then(response => {
    //     let responseData = {
    //         status: response.status
    //     }
    //     if (response.status !== 200) {
    //         responseData.message = response.message;
    //     }
    //     console.log(responseData, response);
    //     res.status(response.status).json(responseData);
    // })
    .catch(error => send_json_error(res, error)); 
}

/** 
 * Check if the project has enough inputs to meet the fund_goal, and if so construct and transmit the funding transaction 
 * 
 * @returns {Promise.<boolean>} whether combined and sent successfully or not 
 * @throws {Error} rethrows any errors encountered during db calls, transaction crafting, transmission
 */
function compilePartialTransaction(project_id) {
    let project;
    let query_str = "select * from projects where project_id=?";
    return db.query(query_str, [project_id])
    .then(results => {
        project = results[0];
        if (project) {
            let pledged = Number(project.amount_pledged);
            let goal = Number(project.fund_goal);
            
            // only if amount pledged exceeds goal, combine the partial transactions. else return false
            if (pledged < goal) {
                return false;
            } else {
                // get all the pledge inputs for this project
                query_str = "select * from pledges natural join pledge_inputs where project_id=?";
                return db.query(query_str, [project_id]);
            }
        } else {
            return Promise.reject(new Error('Invalid project id'));
        }
    })
    .then(pledge_inputs => {
        if (pledge_inputs === false || !pledge_inputs.length)
            return false;
        
        // set outputs for the input objects correctly for the bitcore API
        pledge_inputs = pledge_inputs.map(inputObj => {
            inputObj.output = {};
            inputObj.output.satoshis = inputObj.output_satoshis;
            inputObj.output.script = inputObj.output_script;
            return inputObj;
        });

        let fundingTransaction = wallet.compileTransaction(pledge_inputs, {
            address: project.address,
            fund_goal: project.fund_goal
        });

        console.log("funding transaction: ", fundingTransaction.toString());

        return blockchain.sendTx(fundingTransaction.serialize({disableIsFullySigned: true})).then(response => {
            console.log(response);
            // return whether combined and sent successfully or not
            return response.status == 200;
        });
    })
    .catch(error => {
        throw error;
    });
}

/**
 * Function to validate data from make_pledge route. Depends on stage. 
 * 
 * @param {object} data 
 * @param {object} options 
 * @param {string} [options.stage='initial']  
 * 
 * @returns {boolean}
 */
function validate_make_pledge(data, options) {
    options = options || {};
    let stage = options.stage || "initial";
    if (stage === "initial") {
        // amount, mnemonic
        // convert amount to number
        data.amount = Number(data.amount);
        // must be valid number greater than 0
        if (isNaN(data.amount) || data.amount <= 0)
            return false;
        //TODO:validate mnemonic
        return true;
    } else if (stage === "transmitPartial") {
        return _validateTxInput(data);
    }
}

/**
 * @param {object} input the transaction Input object
 * @param {string} input.prevTxId the id of the tx containing this output
 * @param {number} input.outputIndex the index of this output in tx referenced by prevTxId
 * @param {number} input.sequenceNumber
 * @param {string} input.script the script as a hex string
 * @param {object} input.output
 * @param {number} input.output.satoshis The value / amount in the output (in satoshis)
 * @param {string} input.output.script The locking script for the output in prevTx 
 * @param {string} [input.scriptString] human readable form of the script
 * 
 * @returns {boolean}
 */
function _validateTxInput(input) {
    let expected_properties = ['prevTxId', 'outputIndex', 'sequenceNumber', 'script', 'output'];
    let input_properties = Object.keys(input);

    // check that all the expected properties exist
    if (!expected_properties.every(prop => input_properties.indexOf(prop) >= 0))
        return false;

    // check string properties are valid
    if (!validate_text(input.prevTxId) || !validate_text(input.script) || !validate_text(input.output.script)) 
        return false;

    // check the optional string property
    if (input.hasOwnProperty('scriptString') && !validate_text(input.scriptString))
        return false;

    // check number properties are valid

    // convert outputIndex to number
    input.outputIndex = Number(input.outputIndex);
    // must be valid number greater than 0
    if (isNaN(input.outputIndex) || input.outputIndex < 0)
        return false;

    // convert sequenceNumber to number
    input.sequenceNumber = Number(input.sequenceNumber);
    // must be valid number greater than 0
    if (isNaN(input.sequenceNumber) || input.sequenceNumber < 0)
        return false;

    // convert output.satoshis to number
    input.output.satoshis = Number(input.output.satoshis);
    // must be valid number greater than 0
    if (isNaN(input.output.satoshis) || input.output.satoshis <= 0)
        return false;

    // all checks passed
    return true;
}

/**
 * Sends custom error object as JSON with status (defaults to 500) and message. 
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
function send_json_error(res, err) {
    let errStatus = err.status || 500;
    res.status(errStatus).json({
        status: errStatus,
        message: err.message
    });
} 

/**
 * Updates the hd wallet indices (external index or change index) in the database
 * based on the provided values in the indices_to_set object.
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
            return Promise.resolve();
        } else {
            return Promise.reject(new Error('Update operation failed'));            
        }
    });
}

module.exports = router;
