const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('cookie-session');

const config = require('./config')

var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//middleware
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session(config.session));

// give templates access to session data
app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
});

// spin up db
var db = require('./src/database').get_db();
db.open().catch(error => console.log("error opening db"));

var index = require('./routes/index');
var projects = require('./routes/projects');
var login = require('./routes/login');
var logout = require('./routes/logout');
var register = require('./routes/register');
var profile = require('./routes/profile');
var transmit = require('./routes/transmit');
var wallet = require('./routes/wallet');

app.use('/', index);
app.use('/projects', projects);
app.use('/login', login);
app.use('/logout', logout);
app.use('/register', register);
app.use('/users', profile);
app.use('/transmit', transmit);
app.use('/wallet', wallet);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
