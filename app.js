var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var axios = require('axios');
var apiai = require('apiai');
var path = require('path');
var { router } = require('./routes');
var models = require('./models/models');
var User = models.User;

var app = express();

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var WebClient = require('@slack/client').WebClient;
var IncomingWebhook = require('@slack/client').IncomingWebhook;

var token = process.env.SLACK_API_TOKEN || '';
var url = process.env.SLACK_WEBHOOK_URL || '';
var apitoken = process.env.API_ACCESS_TOKEN;

var application = apiai("0363b04fac5d44899aa10b88294aa6cc");

var web = new WebClient(token);
var rtm = new RtmClient(token, { /*logLevel: 'debug'*/ });
var webhook = new IncomingWebhook(url);
rtm.start();

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  var slackUsername = rtm.dataStore.getUserById(message.user);

  var dm = rtm.dataStore.getDMByUserId(message.user);
  console.log('dm', dm)

  if(message.username === 'Schedulerbot' || !dm || dm.user !== message.user || slackUsername.name === 'schedulerbot') {
    return;
  } else {
    console.log('DOING AXIOS POST')
    axios({
      method: 'post',
      url: 'https://api.api.ai/v1/query?v=20150910',
      headers: {
        'Authorization': 'Bearer ' + apitoken, // This should be the slack api token
        'Content-Type': 'application/json; charset=utf-8',
      },
      data: {
        query: message.text,
        sessionId: message.user,
        lang: 'en',
        //timezone: new Date(),
      }
    })
    .then(function(response) {
      //var userAuthUrl = findUser(message.user, slackUsername.name);
      let result;
       return User.find({slack_id: message.user}, function(err, user){
        if (err) console.log("Err", err);
        if(user.length !== 0){
          if(user[0].google_profile){
              //oauth2Client.setCredentials(user[0].google_profile);
              result = true;
          }else{
              result = false;
          }
        }else{
          new User({
              slack_id: message.user,
              slack_name: slackUsername.name,
          }).save(function(err, user){
              console.log("save success");
          });
          result = false;
        }
        console.log('result', result);
    })
    .then(function(resp) {
      if (!result) {
        var finalmessage = response.data.result.fulfillment.speech + '?auth_id=' + message.user;
          rtm.sendMessage(finalmessage, message.channel);
      } else if(!response.data.result.fulfillment.speech.includes('Okay! Scheduling')) {
// =======
//       // console.log('response', response);
//       if(response.data.result.fulfillment.speech.includes('Welcome to Scheduler Bot!')) {
//         var userAuthUrl = findUser(message.user, slackUsername.name);
//         console.log('userAuthUrl', userAuthUrl)
//         console.log('WELCOMEEEEEEEEEE')
//           var finalmessage = response.data.result.fulfillment.speech + '?auth_id=' + message.user;
//           rtm.sendMessage(finalmessage, message.channel)
//       } else if(!response.data.result.fulfillment.speech.includes('Okay! Scheduling') && !response.data.result.fulfillment.speech.includes('Welcome to Scheduler Bot!')) {
// >>>>>>> db2516b0be59869ddc1f42d59713f036512802b8
        rtm.sendMessage(response.data.result.fulfillment.speech, message.channel);
      } else if( response.data.result.fulfillment.speech.includes('Okay! Scheduling')) {
        web.chat.postMessage(message.channel,
            "Does this look good?",
            { "attachments": [
                {
                    "text": response.data.result.fulfillment.speech,
                    "fallback": "Error",
                    "callback_id": "confirm_task",
                    "color": "#3AA3E3",
                    "attachment_type": "default",
                    "actions": [
                        {
                            "name": "confirm",
                            "text": "Yes",
                            "type": "button",
                            "value": "yes",
                            "confirm": {
                                "title": "Are you sure?",
                                "text": "This will add a calendar reminder to your google acount",
                                "ok_text": "Yes",
                                "dismiss_text": "No"
                            }
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
      }
    })

    })

      //console.log('userAuthUrl', findUser(message.user, slackUsername.name));
      // console.log('response', response);
    //   if(response.data.result.fulfillment.speech.includes('Welcome to Scheduler Bot!')) {
    //     console.log('WELCOMEEEEEEEEEE')
    //       var finalmessage = response.data.result.fulfillment.speech + '?auth_id=' + message.user;
    //       rtm.sendMessage(finalmessage, message.channel)
    //   } else if(!response.data.result.fulfillment.speech.includes('Okay! Scheduling')) {
    //     rtm.sendMessage(response.data.result.fulfillment.speech, message.channel);

    //   } else if( response.data.result.fulfillment.speech.includes('Okay! Scheduling')) {
    //     web.chat.postMessage(message.channel,
    //   	    "Does this look good?",
    //   	    { "attachments": [
    //   	        {
    //   	            "text": response.data.result.fulfillment.speech,
    //   	            "fallback": "Error",
    //   	            "callback_id": "confirm_task",
    //   	            "color": "#3AA3E3",
    //   	            "attachment_type": "default",
    //   	            "actions": [
    //   	                {
    //   	                    "name": "confirm",
    //   	                    "text": "Yes",
    //   	                    "type": "button",
    //   	                    "value": "yes",
    //                         "confirm": {
    //                             "title": "Are you sure?",
    //                             "text": "This will add a calendar reminder to your google acount",
    //                             "ok_text": "Yes",
    //                             "dismiss_text": "No"
    //                         }
    //   	                },
    //   	                {
    //   	                    "name": "confirm",
    //   	                    "text": "No",
    //   	                    "type": "button",
    //   	                    "value": "no"
    //   	                }
    //   	            ]
    //   	        }
    //   	    ]
    //   		}, function(err, res){
    //   			if (err) console.log('Error:', err);
    //   			else console.log('Response', res);
    //   			}
    //   	);
    //   }
    // })
    .catch(function(err) {
      console.log('Error: ', err);
    })
  }
});

rtm.on(RTM_EVENTS.USER_TYPING, function handleRtmTyping(message){
	// var result = AIpost(message);
	// console.log("result is:", result);

})

rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
  console.log('Reaction added:', reaction);
});

rtm.on(RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
  console.log('Reaction removed:', reaction);
});

app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(router);

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

app.post('/interact', function(req, res) {
	if (req.token !== process.env.VERIFICATION_TOKEN) console.log("Bad message!");
	else {
		var answer = JSON.parse(req.body.payload)
		console.log("Got it! You answered:", answer.actions[0].value);
		res.send('Ok');
	}
})

var port = process.env.PORT || 3000;
app.listen(port);
console.log('Express started. Listening on port %s', port);

module.exports = app;
