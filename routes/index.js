/** 
 * Index route module.
 * @module routes/index 
*/

const express = require('express');
const router = express.Router();

const wallet = require('../src/wallet');

/** 
 * Database wrapper object.
 * @type {Database} 
*/
var db = require('../src/database').get_db();
// db.open().catch(error => console.log("error opening db"));

/**
 * Display home page showing recent projects.
 *
 * @name Home page
 * @route {GET} /
 */
router.get('/', function (req, res, next) {
    let query_str = "select * from projects natural join users order by date_added desc";
    db.query(query_str)
    .then(results => {
        let projects = wallet.convertToBtc(results, ["amount_pledged", "fund_goal"]);
        res.render('index', { title: '', projects: projects });
    })
    .catch(error => {
        console.log(error);
        next(error); // 500 
    });
});

module.exports = router;
