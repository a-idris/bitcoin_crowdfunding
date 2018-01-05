var instance;

var db = function Database() {
    this.config = require('./config');
}

db.prototype.open = function() {
    var mysql = require('mysql');
    // connect using config file
    // use connection pool to improve throughput
    var pool = mysql.createPool(this.config); 

    // return promise, reject if err is raised else resolve
    return new Promise((resolve, reject) => {
        pool.connect(function(err) {
            reject(err);
        });
        console.log(`connected to ${this.config.database} at ${this.config.host}`);
        resolve();
    });

    this.pool = pool;
}

// promise wrappers
db.prototype.query = function(queryString) {
    return new Promise(function(resolve, reject) {
        this.con.query(queryString, function(err, results, fields) {
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

db.prototype.close = function() {
    return new Promise((resolve, reject) => {
        this.pool.end( err => {
            reject(err);
        });
        resolve(true);
    });
}

// module.exports = db;

// singleton
exports.get_db() = function() {
    if (instance) {
        return instance;
    } else {
        instance = new Database();
        return instance;
    }
}


