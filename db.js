var pg = require('pg');
// Set up database
var db = {};

db.config = {
  user: "vagrant",
  password: "dbpass",
  database: "vagrant",
  port: 5432,
  host: "localhost"
};

db.connect = function(runAfterConnecting) {
	pg.connect(db.config, function(err, client, done){
		if (err) {
			console.error("PG Connect Error", err);
		}
		runAfterConnecting(client);
		done();
	});
};

db.query = function(statement, params, callback){
	db.connect(function(client){
		client.query(statement, params, callback);
	});
};

module.exports = db;