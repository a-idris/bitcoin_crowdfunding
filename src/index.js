var express = require('express');
var path = require('path');
var body_parser = require('body-parser');
var bitcoin = require('./bitcoin');

var app = express();

//templating setup
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'pug')

//middleware func to serve static content from public directory 
app.use(express.static(path.join(__dirname, '..', 'public')));

//middleware funcs to parse http body
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended : true}));

app.get('/', function(req, res) {
    res.render('index.pug');
});

app.get('/wallet', function(req, res) {
    res.render('wallet.pug');
});

app.post('/transmit', function(req, res) {
    console.log(req.body.rawtx);
    // bitcoin.decode(req.body.rawtx, function(tx) {
    //     console.log(tx);
    //     res.render('transaction.pug', tx);
    // });
    //call bitcoin.send_rawtx and on callback render the transaction.pug page with returned txid.  
    bitcoin.send_rawtx(req.body.rawtx, function(txid) {
        console.log(txid);
        res.render('transaction.pug', { 'txid': txid });
    });
    
});

app.listen(3000, function() {
    console.log("starting server on port 3000");
});