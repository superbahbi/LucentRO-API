// api.js
var express		= require('express');        
var app			= express();                 
var bodyParser 	= require('body-parser');
var mysql		= require('mysql');
var crypto 		= require('crypto');
var rs = require("randomstring");
var config		= require('./config.js');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var session = {};
var port = process.env.PORT || 80;
var router = express.Router();              
var router404 = express.Router();  
// Set up database 
var db = mysql.createConnection({
	host     : config.host,
	user     : config.username,
	password : config.password
});

// Connect to database
db.connect(); 

function isAuthenticated(token, res) {
	//console.log('SELECT * FROM ragnarok.app_access_token WHERE access_token="'+token+'"');
	db.query('SELECT * FROM ragnarok.app_access_token WHERE access_token="'+token+'" LIMIT 1', function(err, result) {
		if (err) { 
			res.json({ error: { message: 'No access token!' }}); 
		} else if (!result[0]) { 
			res.json({ error: { message: 'Invalid access token!' }}); 
		}
		session.account_id 		= result[0].account_id;
		session.access_token 	= result[0].access_token;
		session.expiration_date = result[0].expiration_date;
		console.log(result);
	});
}
//Middleware
router.use(function(req, res, next){
    console.log('Connected');
    next();
});

router.get('/', function(req, res) {
	res.json({ result: { message: 'Lucent Data Api!' }});
});

router.route('/account')
	// http://api.lucentro.com/v1/account
	.get(function(req, res){
	
		isAuthenticated(req.query.access_token, res);
		
		db.query('SELECT account_id, userid, sex, email, group_id, state, unban_time, expiration_time, logincount, lastlogin, last_ip, birthdate FROM ragnarok.login', function(err, rows, fields) {
			if (err) throw err;
			res.json(rows)
		});
	});
router.route('/account/:id')
	// http://api.lucentro.com/v1/account
	.get(function(req, res){
	
		isAuthenticated(req.query.access_token, res);
		
		param  = {account_id: req.params.id};
		db.query('SELECT account_id, userid, sex, email, group_id, state, unban_time, expiration_time, logincount, lastlogin, last_ip, birthdate FROM ragnarok.login WHERE ?', param, function(err, rows, fields) {
			if (err) throw err;
			res.json(rows)
		});
	}); 
router.route('/character')
	// http://api.lucentro.com/v1/character
	.get(function(req, res){
	
		isAuthenticated(req.query.access_token, res);
		
		db.query('SELECT * FROM ragnarok.char', function(err, rows, fields) {
			if (err) throw err;
			res.json(rows)
		});
	});

router.route('/character/:id')
	// http://api.lucentro.com/v1/character/<character id>
	.get(function(req, res){

		isAuthenticated(req.query.access_token, res);
		
		param  = {char_id: req.params.id};
		db.query('SELECT * FROM ragnarok.char WHERE ?', param, function(err, result) {
			if (err) throw err;
			res.json(result)
		});
	});


router.route('/session')
	// http://api.lucentro.com/v1/session {account_id: id}
	.post(function(req, res){
		var data = req.body.account_id;
		res.json({ result: { message: data}})
	});
  
router.route('/login')
	// http://api.lucentro.com/v1/login {userid: username, user_pass: password}
	
	.post(function(req, res){
		
		var account_id;
		password = req.body.password;
		
		db.query('SELECT * FROM ragnarok.login WHERE userid="'+req.body.username+'" AND user_pass="'+password+'"', function(err, result) {
			if (err) {
				res.json(err);
			} else if (result[0]) {
				// get access token
				account_id = result[0].account_id;
				db.query('SELECT * FROM ragnarok.app_access_token WHERE account_id="'+account_id+'" LIMIT 1', function(err, result) {
					if (err) {
						res.json(err);
					} else if(!(result[0])){
						// if access token doesn't exist then generate a token
						
						access_token = rs.generate(); // pass the token to INSERT
						db.query("INSERT INTO ragnarok.app_access_token (`account_id`,`access_token`) VALUES ('"+account_id+"', '"+access_token+"')", function(err, result) {
							if (err) {
								res.json(err);
							}
						});
					} else {
						access_token = result[0].access_token;
					}
					res.json({ message: 'Login data found!', access_token: access_token })
				});
			} else {
				console.log(req.body.username);
				console.log(password);
				res.json({ result: {message: 'Can not find login data!'}})
			}
		});
	});

router.route('/register')
	// http://api.lucentro.com/v1/register {"userid":"username","user_pass":"password","confirm_pass":"password","sex":"F","email":"a@a.com","birthdate":"1990-12-12"}
	// Todo: register request
	.post(function(req, res){		
		var data = req.body;
		res.json({ result: {message: 'Account created!'}})
	});
router.route('/reward')
	// http://api.lucentro.com/v1/character/<character id>
	.get(function(req, res){
	
		isAuthenticated(req.query.access_token, res);
		
		db.query('SELECT * FROM ragnarok.cp_itemgiver', function(err, result) {
			if (err) throw err;
			res.json(result)
		});
	})
	// item_id, amount, char_name, sender, reason
	// http://api.lucentro.com/v1/register 
	.post(function(req, res){
	
		isAuthenticated(req.query.access_token, res);
		
		var item_id 	= req.body.item_id;
		var amount 		= req.body.amount;
		var account_id 	= req.body.account_id;
		var char_name 	= req.body.char_name;
		var sender 		= req.body.sender;
		var reason 		= req.body.reason;
		if(item_id && amount && account_id && char_name && sender){
			db.query("INSERT INTO ragnarok.cp_itemgiver (`item_id`, `amount`, `account_id`, `char_name`, `sender`, `reason`) VALUES ('"+item_id+"', '"+amount+"', '"+account_id+"', '"+char_name+"', '"+sender+"', '"+reason+"')", function(err, result) {
				if (err) {
					res.json(err);
				}
			});
			res.json({ message: 'Reward created!' });
		}
	});  
// 404 all unused route
router.route('*')
	.get(function(req, res){
		res.json({ result: { message: '404 route not found!'}})
	});
// 404 all unused route
router404.route('*')
	.get(function(req, res){
		res.json({ result: { message: '404 route not found!'}})
	});

app.use('/v1', router);
// 404 all unused route
app.use('/', router404);

// Start the server
app.listen(port);
console.log('Start: port ' + port);
