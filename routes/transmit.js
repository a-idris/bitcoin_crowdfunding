var express = require('express');
var router = express.Router();

var bitcoin = require('../src/bitcoin');

router.post('/', function(req, res, next) {
    console.log(req.body.rawtx);
    // bitcoin.decode(req.body.rawtx, function(tx) {
    //     console.log(tx);
    //     res.render('transaction.pug', tx);
    // });
    //call bitcoin.send_rawtx and on callback render the transaction.pug page with returned txid.  
    bitcoin.send_rawtx(req.body.rawtx, function(txid) {
        console.log(txid);
        res.render('transaction', { title: 'transaction', txid: txid });
    });
    
});

module.exports = router;
