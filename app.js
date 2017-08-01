var express = require('express');
var request = require('request');
var axios = require('axios');
var apiai = require('apiai');

var app = express();

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var WebClient = require('@slack/client').WebClient;
var IncomingWebhook = require('@slack/client').IncomingWebhook;

var token = process.env.SLACK_API_TOKEN || '';
var url = process.env.SLACK_WEBHOOK_URL || '';

var application = apiai("0363b04fac5d44899aa10b88294aa6cc");

var web = new WebClient(token);
var rtm = new RtmClient(token, { /*logLevel: 'debug'*/ });
var webhook = new IncomingWebhook(url);
rtm.start();

// const AIpost = function(message) {
//   return axios.post('https:api.api.ai/api/query?v=20150910', {
//     'Headers': {
//       query: message.text,
//       lang: en,
//       sessionId: message.user,
//       timezone: new Date().getTimezoneOffset(),
//     },
//     'Authorization': {
//       Bearer: token, // This should be the slack api token
//     },
//     'Content-Type': 'application/json',
//   })
// }

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  var request = application.textRequest(message, {
      sessionId: message.user,
  });
  console.log(request);
  rtm.sendMessage(request.query, message.channel);
});

rtm.on(RTM_EVENTS.USER_TYPING, function handleRtmTyping(message){
	// var result = AIpost(message);
	// console.log("result is:", result);
	web.chat.postMessage(message.channel,
	    "Does this look good?",
	    { "attachments": [
	        {
	            "text": "New task scheduled",
	            "fallback": "Error",
	            "callback_id": "confirm_task",
	            "color": "#3AA3E3",
	            "attachment_type": "default",
	            "actions": [
	                {
	                    "name": "confirm",
	                    "text": "Yes",
	                    "type": "button",
	                    "value": "yes"
	                },
	                {
	                    "name": "confirm",
	                    "text": "No",
	                    "type": "button",
	                    "value": "no"
	                }
	            ]
	        }
	    ]
		}, function(err, res){
			if (err) console.log('Error:', err);
			else console.log('Response', res);
			}
	);
})

rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
  console.log('Reaction added:', reaction);
});

rtm.on(RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
  console.log('Reaction removed:', reaction);
});

app.get('/', function(req, res){
	res.send('Ngrok is working! Path Hit: ' + req.url);
});

app.get('/oauth', function(req, res){
	 if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        request({
            url: 'https://slack.com/api/oauth.access',
            qs: {code: req.query.code, client_id: process.env.SLACK_CLIENT_ID, client_secret: process.env.SLACK_CLIENT_SECRET},
            method: 'GET',
        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);

            }
        })
    }
});

app.post('/command', function(req, res) {
	res.send("This works too");
})

var port = process.env.PORT || 3000;
app.listen(port);
console.log('Express started. Listening on port %s', port);

module.exports = app;
