var config = require('../config'),
	MongoClient = require('mongodb').MongoClient,
	http = require('http'),
	async = require('async');

var add = function(data) {
	var mongoUrl = 'mongodb://' + config.db.host_port + '/' + config.db.name,
		notificationData = data;

	MongoClient.connect(mongoUrl, function(err, db) {
  		if(!err) {
    		console.log("We are connected");
			db.collection(
				config.db.collection, 
				function (err, col)	{
					async.series([				
						findInfiniteNotifications(col,notificationData),
						findLimitedNotifications(col, notificationData),
						updateNotifications(col,notificationData)
					],
					function(err, results){
						var watchers = results[0].concat(results[1]);
						sendData(notificationData, watchers);
					});
  				}
			);
		}
	});
};

var findInfiniteNotifications = function(col, notificationData){
	return function(callback) {
		col.find({
			'entityType': notificationData.entityType,
       		'entityIds': notificationData.entityId,
	       	'status': 'ACTIVE',
    	   	'notificationCount': {'$exists': false}
		}).toArray(callback);
	}
};

var findLimitedNotifications = function(col, notificationData) {	
	return function(callback) {
		col.find({
    	    'entityType': notificationData.entityType,
        	'entityIds': notificationData.entityId,
	        'status': 'ACTIVE',
    		'notificationCount': {'$gt': 0}
		}).toArray(callback);
	}
};

var updateNotifications = function(col, notificationData) {
	return function(callback) {
		col.update({
    	   	'entityType': notificationData.entityType,
       		'entityIds': notificationData.entityId,
	       	'status': 'ACTIVE',
    	   	'notificationCount': {'$gt': 0}
		}, {
			'$inc': {'notificationCount': -1}
		},
		callback);
	}
};

var sendData = function(notificationData, watchers){
	var ids = [];
	watchers.forEach(function(watcher){
		var id = watcher.scopeId+'';
		if (ids.indexOf(id) < 0){
			ids.push(id);
		}
	});

	if (ids.length > 0) {
		ids = ids.map(function(id) {
			return {id:id};
		});
		notifyWatchers(notificationData, ids);
	}
};

var notifyWatchers = function(notificationData, ids){
	var options = {
	    port: config.popbox.port,
    	hostname: config.popbox.host,
		method: 'POST',
		path: '/trans',
		headers: {
			"Accepts": 'application/json',
			"Content-Type": 'application/json'
		}
	},
	req = http.request(options);

	req.write(JSON.stringify({ payload: JSON.stringify(notificationData), priority: 'H',
		queue: ids
	}));
	req.end();
}

exports.add = add;
