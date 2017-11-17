var express = require('express');
var path = require('path');
var body_parser = require('body-parser');
var app = express();

//templating setup
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'pug')

//middleware func to serve static content from public directory 
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(body_parser.json());
app.use(body_parser.urlencoded({extended : true}));

app.get('/', function(req, res) {
    res.render('index.pug');
});

app.get('/wallet', function(req, res) {
    res.render('wallet.pug');
});

app.post('/pay', function(req, res) {

    if (req.body['amount']) {
        console.log("amountVAL: " + req.body['amount']);
    }

    res.render('wallet')
});

app.post('/transmit', function(req, res) {
    raw_tx = '';

    //use bodyparser.raw()
    req.on('data', function(chunk) {
        raw_tx += chunk;
    });

    req.on('end', function() {
        send_to_bitcoind(raw_tx, function(err, success) {
            ;
        });
        res.render(wallet);
    });
});

app.listen(3000, function() {
    console.log("starting server on port 3000");
});