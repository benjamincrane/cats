var express       = require('express'),
	ejs           = require('ejs'),
	app           = express(),
	session       = require('express-session'),
	path          = require('path'),
	cookieParser  = require('cookie-parser'),
	bodyParser    = require('body-parser'),
	passport      = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	db            = require('./db.js'),
    http          = require('http'),
   methodOverride = require('method-override')
	;
var	parseString   = require('xml2js').parseString ;
var	http          = require('http') ;
	options = { 
	host: 'thecatapi.com', 
	path: '/api/images/get?format=xml&size=small&typ=png,jpg&results_per_page=1'
} 

app.set('view engine','ejs');

app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({'extended':true}));
app.use(session({
	secret: 'secret',
	resave: false,
	saveUnitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	db.query('SELECT * FROM users WHERE id = $1', [id], function(err, dbResult) {
		if (!err) {
			done(err, dbResult.rows[0]);
		}
	});
});

var localStrategy = new LocalStrategy(
	function(username, password, done) {
		db.query('SELECT * FROM users WHERE username = $1', [username],
		 function(err, dbRes) {
			var user = dbRes.rows[0];
			console.log(username)
			console.log(user);
			if (err) { return done(err); }
			if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
			if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
			return done(null, user);
		 }
		)
	}
);

passport.use(localStrategy);

//user page routes
app.get('/', function(req,res) {
	//res.send("stop poking me");
	res.render('index', {user: req.user});
})

app.get('/users/new', function(req,res) {
	res.render('users/new');
})

app.post('/users', function(req,res) {
	db.query("insert into users (username,email,password) values ($1,$2,$3)",
		[req.body.username,req.body.email,req.body.password],
		function(err,dbResult) {
			res.redirect('/');
		}
	)
})

//session routes
app.get('/sessions/new', function(req, res) {
	res.render('sessions/new')
})

app.post('/sessions', passport.authenticate('local',
	{failureRedirect: '/sessions/new'}), function(req, res) {
	db.query("select * from users where username =$1 and password = $2",
		[req.body.email,req.body.password],
		function(err, dbResult) {
			if(!err) {
			res.redirect('/cats/index');
			}
		}
	)
	}
);

app.get('/logout', function(req,res) {
	req.logout();
	res.redirect('/');
})

//cat routes
app.get('/cats/index', function(req,res) {
		res.render('cats/index')
	})

app.get('/cats/liked', function(req,res) {
	var user = [];
	user.push(req.user.id);
	db.query("select * from cat_pictures where user_id =$1 and user_like=true",
		user,
		function(err, dbResult) {
			if(!err) {
				res.render('cats/liked',{prettyCats:dbResult.rows})
			} else {
				console.log(err)
				res.send("pretty kitties not found")
			}
		})
})

app.get('/cats/disliked', function(req,res) {
	var user = [];
	user.push(req.user.id);
	db.query("select * from cat_pictures where user_id =$1 and user_like=false",
		user,
		function(err, dbResult) {
			if(!err) {
				res.render('cats/disliked',{badCats:dbResult.rows})
			} else {
				console.log(err)
				res.send("unloved cats not found")
			}
		})
})

app.get('/cats/chooser', function(req, res) {
	var catObject = http.get(options, function(resu) {
  		var bodyChunks = [];
  		resu.on('data', function(chunk) {
			bodyChunks.push(chunk);
  		}).on('end', function() {
			var body = Buffer.concat(bodyChunks);
			parseString(body, function (err, result) {
				cat={}
				cat.url = result.response.data[0].images[0].image[0].url;
				cat.id = result.response.data[0].images[0].image[0].id;
				cat.src = result.response.data[0].images[0].image[0].source_url;
				var url1 = JSON.stringify(cat.url)
				var id1 = JSON.stringify(cat.id)
				var src1 = JSON.stringify(cat.src)
				var url = url1.substring(2,url1.length-2);
				var id = id1.substring(2,id1.length-2);
				var src = src1.substring(2,src1.length-2);
				params = [url,id,src,req.user.id]
				db.query("insert into cat_pictures (url,cat_id,src,user_id) values ($1,$2,$3,$4)",
		 		params,
			 	function() {
					res.render('cats/chooser',{cat:cat})
				});
			});
		})
	});
});

app.post('/cats/chooser', function(req,res) {
	user = req.user.id;
	catString = req.body.liked;
	catID = catString.substring(0, catString.length-2)
	catRating = catString.slice(-1);
	if (catString.slice(-1)==="t")
	{likeValue = true}
	else
	{likeValue = false}
	params = [likeValue,catID];
	db.query("update cat_pictures set user_like = $1 where cat_id=$2",
		params,
		function(err, dbResult) {
			res.redirect('chooser')
		})
});


app.get('/cats/:id', function(req,res) {
	db.query("select * from posts where id = $1", [req.params.id],
		function(err,dbResult) {
			if(!err) {
				res.render('cats/show',{post: dbResult.rows[0]});
			} else {
				res.send("cats get cat_id failed");
			}
		})
})


app.listen(process.env.PORT || 3000, function() {
	console.log("Your sound card works perfectly.");
});