
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var config = require('./config.js');

var app = express();

// all environments
app.set('port', config.port);

app.use(express.compress({
	level: 9,
	memLevel: 9
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/docs', express.static(path.join(__dirname, 'docs')) );

app.set('views', path.join(__dirname, 'views'));


app.engine('hjs', require('hogan-express'));
app.set('view engine', 'hjs');
app.set('layout', 'layout');
app.set('partials', {datamanager: 'datamanager'} );

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.locals.config = config;

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
