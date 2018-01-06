function Database() {
    this.config = require('../config');
}

Database.prototype.open = function() {
    var mysql = require('mysql');
    // connect using config file
    // use connection pool to improve throughput
    this.pool = mysql.createPool(this.config.db); 

    return Promise.resolve();
    // return promise, reject if err is raised else resolve
    // return new Promise((resolve, reject) => {
    //     pool.connect(function(err) {
    //         reject(err);
    //     });
    //     console.log(`connected to ${this.config.database} at ${this.config.host}`);
    //     resolve();
    // });
}

// promise wrappers
Database.prototype.query = function(queryString) {
    return new Promise((resolve, reject) => {
        this.pool.query(queryString, function(err, results, fields) {
            if (err) {
                reject(err);
            } else if (fields) {
                resolve({results: results, fields: fields});
            } else {
                resolve(results);
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

// module.exports = db;


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


