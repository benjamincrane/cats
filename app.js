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
   methodOverride = require('method-override')
	;

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
			res.redirect('/');
			}
		}
	)
	}
);

app.delete('/sessions', function(req,res) {
	res.logout();
	res.redirect('/');
})

//cat routes
app.get('/cats/index', function(req,res) {
	// db.query("select * from posts where user_id=$1",
	// 	[req.user.id],
	// 	 function(err,dbResult) {
	// 	 	if(!err) {
		res.render('cats/index'
			// , {posts:dbResult.rows}
			)
			// } else {
			// 	res.send("select * from posts user_id failed")
			// }
	})
// })

app.get('/cats/chooser', function(req,res) {
	//need to be able to accept ID field for 'edit' functionality
	res.render('cats/chooser');
})

app.get('/cats/liked', function(req,res) {
	res.render('cats/liked');
})

app.get('/cats/disliked', function(req,res) {
	res.render('cats/disliked');
})

app.post('/posts', function(req,res) {
	db.query("insert into posts (title, body, user_id) values ($1,$2,$3)",
		 [req.body.title,req.body.body,req.user.id],
		 function(err, dbResult) {
			if(!err) {
				res.redirect('/posts/index',{posts:dbResult.rows});
			} else {
				res.send("post post failed");
			}
		})
}
)

app.get('/cats/:id', function(req,res) {
	db.query("select * from posts where id = $1", [req.params.id],
		function(err,dbResult) {
			if(!err) {
				res.render('posts/show',{post: dbResult.rows[0]});
			} else {
				res.send("posts get post_id failed");
			}
		})
})

app.get('/cats/:id/edit', function(req,res) {
	db.query("select * from posts where id = $1", [req.params.id],
		function(err,dbResult) {
			if(!err) {
				res.render('posts/edit',{post: dbResult.rows[0]});
			} else {
				res.send("post edit failed");
			}
		})
})

app.patch('/posts/:id', function(req,res) {
	db.query('update posts set title=$1, body=$2 where id = $3',
		[req.body.title, req.body.body,req.params.id],
		function(err, dbResult) {
			if(!err) {
				res.redirect('/posts/'+req.params.id);
			}
		})
})

app.delete('/posts/:id', function(req,res) {
	db.query("delete from posts where id=$1", [req.params.id],
		function(err,dbResult) {
			if(!err) {
				res.redirect('/posts')
			}
		})
})

app.listen(3000, function() {
	console.log("I am ready");
});