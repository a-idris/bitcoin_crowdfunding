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

// promise wrappers
Database.prototype.query = function(queryString, values, includeFields) {
    return new Promise((resolve, reject) => {
        this.pool.query(queryString, values, function(err, results, fields) {
            if (err) {
                reject(err);
            } else if (!includeFields) {
                resolve(results);
            } else {
                resolve({results: results, fields: fields});
            }
        });
    }); 
}

// todo: streaming query

Database.prototype.close = function() {
    return new Promise((resolve, reject) => {
        this.pool.end( err => {
            reject(err);
        });
        resolve(true);
    });
}

// singleton
var instance;
exports.get_db = function() {
    if (instance) {
        return instance;
    } else {
        instance = new Database();
        return instance;
    }
}


