var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('wallet', {title: 'wallet', session: req.session});
});

module.exports = router;
