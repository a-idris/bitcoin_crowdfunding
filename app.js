var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// spin up db
var db = require('./src/database').get_db();
db.open().catch(error => console.log("error opening db"));

var index = require('./routes/index');
var projects = require('./routes/projects');
var login = require('./routes/login');
var register = require('./routes/register');
var profile = require('./routes/profile');
var transmit = require('./routes/transmit');
var wallet = require('./routes/wallet');

var config = require('./config')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/projects', projects);
app.use('/login', login);
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
