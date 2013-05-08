var restify = require('restify'),
	notification = require ('./lib/notification');

var server = restify.createServer();
server.use(restify.bodyParser());

var addNotification = function(req, res, next){
    var data = req.body;
    if (req.body && typeof(req.body) === 'string'){
        try {
            data = JSON.parse(req.body);
        } catch(ex) {
            res.send(400, 'invalid parameter');
            return;
        }
    }

    res.send(200, 'ok');
    notification.add(data);
};


server.post('/notification', addNotification);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
