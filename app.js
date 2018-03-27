/** 
 * Application entry point. Sets up the requires, database connection, middleware, and routers. 
 * @module app
*/

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

// give views access to session data
app.use(exposeSessionToLocals);

// spin up db
var db = require('./src/database').get_db();
db.open().catch(error => console.log("error opening db"));

//set up the routers 
var index = require('./routes/index');
var projects = require('./routes/projects');
var login = require('./routes/login');
var logout = require('./routes/logout');
var register = require('./routes/register');
var users = require('./routes/users');

app.use('/', index);
app.use('/projects', projects);
app.use('/login', login);
app.use('/logout', logout);
app.use('/register', register);
app.use('/users', users);

// if fallen through to notFoundHandler without matching a route, raises 404 error
app.use(notFoundHandler);
// handle errors
app.use(errorHandler);

//custom middleware

/**
 *  Convenience function to give views access to session data
 * 
 * @function
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Next middleware function
*/
function exposeSessionToLocals(req, res, next) {
    res.locals.session = req.session;
    next();
}

/**
 *  Raises a 404 error and passes to next middleware function ({@link errorHandler}). Used to raise 404's on unmatched routes.
 * 
 * @function
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Next middleware function
*/
function notFoundHandler(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
}

/**
 *  Error handler which will render an error page with a status and error message.
 * 
 * @function
 * @param {Object} err Error object
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Next middleware function
*/
function errorHandler(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
}

module.exports = app;
