var express = require('express');
var router = express.Router();

/* GET home page. */
// list of projects, link to project.pug  
// users/:id
// users/:id/projects
// projects/create
// projects/:id
// projects/:id/edit
// projects/:id/delete

// controllers:
// users
// projects
router.get('/', function(req, res, next) {
  res.render('index', {title:''});
});

module.exports = router;
