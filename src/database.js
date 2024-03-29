/**
 * A database connection object. 
 * @typedef {Object} Connection 
*/

/** 
 * Database wrapper class.
 * @class
 * 
 * @constructor
 * 
 * @property config The configuration details for the database 
*/
function Database() {
    // set config from file
    this.config = require('../config').db;
}

/** 
 * Connects to the database and creates a connection pool.
 * 
 * @async
 * @returns {Promise<undefined>} A promise that returns undefined if resolved. 
*/
Database.prototype.open = function() {
    var mysql = require('mysql');
    // connect using config file
    // use connection pool to improve throughput
    this.pool = mysql.createPool(this.config); 
    return Promise.resolve();
}

/**
 * Returns a connection to execute the transaction statements with. 
 * 
 * @async
 * @returns {Promise.<Connection|Error>} A promise that returns a Connection if resolved, or an Error if rejected.
*/
 Database.prototype.begin_transaction = function() {
    let this_db = this;     
    return new Promise((resolve, reject) => {
        // transaction support available at connection level, so need to get connection
        this.pool.getConnection(function(err, connection) {
            if (err) {
                return reject(err);
            } else {
                connection.beginTransaction(function(err) {
                    if (err) {
                        // if error return the connection to the pool
                        connection.resolve();
                        return reject(err);
                    }
                    resolve(connection);
                });
            }
        });
    });
}

/**
 * Execute a sql query. 
 *
 * @async
 * @param {string} queryString A raw SQL string
 * @param {string[]} values Parameters to the queryString
 * @param {object} options Pass additional options
 * @param {boolean} options.includeFields If set to true, function will also return field info 
 * @param {Connection} options.transactionConnection If supplied, will execute query as part of transaction, rolling back if an error is encountered.
 * @returns {Promise.<object|Error>} A promise that returns a results object if resolved, or an Error if rejected.
*/
Database.prototype.query = function(queryString, values, options) {
    //unpack options
    options = options || {}
    //set defaults
    let includeFields = options.includeFields || false;
    let transactionConnection = options.transactionConnection || undefined;

    // save context
    let this_db = this;    
    return new Promise((resolve, reject) => {
        // connection type depends on if currently executing transaction.
        let conn = transactionConnection || this.pool;
        conn.query(queryString, values, function(err, results, fields) {
            if (err) {
                if (transactionConnection) {
                    // if this is a transaction, execute rollback
                    this_db.rollback(conn)
                        .then(rollbackSuccess => {
                            //if rollback success, reject with original error
                            reject(err)
                        })
                        .catch(rollbackError => {
                            // if rollback error, reject with addition rollback error as property of original error
                            let overallErr = new Error(err);
                            overallErr.rollbackError = rollbackError;
                            reject(overallErr)
                        });
                } else {
                    return reject(err);
                }
            } else if (!includeFields) {
                resolve(results);
            } else {
                resolve({results: results, fields: fields});
            }
        });
    }); 
}

/**
 * Commit a transaction. 
 *
 * @async
 * @param {Connection} connection The connection returned from [begin_transaction]{@link Database#begin_transaction}
 * @returns {Promise.<undefined|Error>} A promise that returns undefined if resolved, or an Error if rejected.
*/
Database.prototype.commit = function(connection) {
    let this_db = this;
    return new Promise((resolve, reject) => {
        connection.commit(function(err) {
            if (err) {
                // if error encountered while committing, rollback the transaction
                this_db.rollback(connection)
                    .then(rollbackSuccess => {
                        //if rollback success, reject with original error
                        reject(err)
                    })
                    .catch(rollbackError => {
                        // if rollback error, reject with addition rollback error as property of original error
                        let overallErr = new Error(err);
                        overallErr.rollbackError = rollbackError;
                        reject(overallErr)
                    });
            } else {
                // on success, release the connection back to the pool and resolve
                connection.release();
                resolve();
            }
        });
    });
}

/**
 * Roll back a transaction. 
 *
 * @async
 * @param {Connection} connection The connection returned from [begin_transaction]{@link Database#begin_transaction}
 * @returns {Promise.<undefined|Error>} A promise that returns undefined if rollback is successful and resolved, or an Error if rejected.
*/
Database.prototype.rollback = function(connection) {
    return new Promise((resolve, reject) => {
        connection.rollback(function(rollback_err) {
            //release the connection to the pool regardless of rollback success
            connection.release();
            
            // resolve/reject depending on error existence
            if (rollback_err) {
                return reject(rollback_err);
            }

            resolve(); 
        });
    });
}

/**
 * Close all the connections in the connection pool.
 *
 * @async
 * @returns {Promise.<undefined|Error>} A promise that returns undefined if resolved, or an Error if rejected.
*/
Database.prototype.close = function() {
    let this_db = this;    
    return new Promise((resolve, reject) => {
        this_db.pool.end(err => {
            // reject/resolve depending on existence of error
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Database module
 * @module src/database
 */

var instance;

/** Return the singleton instance of the {@link Database} class 
 * 
 * @function
 * @returns {Database} database instance
*/
exports.get_db = function() {
    if (!instance) {
        instance = new Database();
    }
    return instance;
}
