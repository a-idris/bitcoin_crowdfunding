function Database() {
    this.config = require('../config');
}

Database.prototype.open = function() {
    var mysql = require('mysql');
    // connect using config file
    // use connection pool to improve throughput
    this.pool = mysql.createPool(this.config.db); 
    return Promise.resolve();
}

// returns the connection to execute the transaction statements with, or rejects if some error is encountered
Database.prototype.begin_transaction = function() {
    return new Promise((resolve, reject) => {
        // transaction support available at connection level, so need to get connection
        this.pool.getConnection(function(err, connection) {
            if (err) {
                return reject(err);
            } else {
                connection.beginTransaction(function(err) {
                    if (err) {
                        connection.resolve();
                        return reject(err);
                    }
                    resolve(connection);
                });
            }
        });
    });
}

Database.prototype.query = function(queryString, values, includeFields, transactionConnection) {
    return new Promise((resolve, reject) => {
        // connection type depends on if currently executing transaction.
        let conn = transactionConnection || this.pool;
        conn.query(queryString, values, function(err, results, fields) {
            if (err) {
                if (transactionConnection) {
                    // if this is a transaction, execute rollback
                    this.rollback(conn)
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

Database.prototype.commit = function(connection) {
    return new Promise((resolve, reject) => {
        connection.commit(function(err) {
            if (err) {
                // if error encountered while commiting, rollback the transaction
                this.rollback(connection)
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
                // release the connection back to the pool
                connection.release();
                resolve();
            }
        });
    });
}

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

// todo: streaming query
Database.prototype.close = function() {
    return new Promise((resolve, reject) => {
        this.pool.end( err => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

// singleton
var instance;
exports.get_db = function() {
    if (!instance) {
        instance = new Database();
    }
    return instance;
}


