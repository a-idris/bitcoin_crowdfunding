const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
    // destroy the session
    req.session = null;
    // redirect home
    res.redirect('/');
});

module.exports = router;