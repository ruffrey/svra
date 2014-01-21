var config = require("../config.js");

exports.index = function(req, res){
  	res.render('index', { 
  		title: config.appname,
  		partials: {
  			datamanager: 'datamanager'
  		}
  	});
};
