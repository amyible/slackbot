var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var axios = require('axios');
var apiai = require('apiai');
var path = require('path');
var { router, addAllDayEvents, addMeetings, checkFreeBusy } = require('./routes');
var models = require('./models/models');
var { findConflict, suggestTimes } = require('./merge');
var { AllHasAccess } = require('./newInvitees');
var User = models.User;
var Reminder = models.Reminder;
var Meeting = models.Meeting;

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

var reponseJSON;
var channel;
rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  // console.log('message', message)
  channel = message.channel;
  var slackUsername = rtm.dataStore.getUserById(message.user);

  var dm = rtm.dataStore.getDMByUserId(message.user);
  // console.log('dm', dm)

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
      responseJSON = response;
      let result;
      return User.find({slack_id: message.user}, function(err, user){
        if (err) console.log("Err", err);
        if(user.length > 0){
          if(user[0].google_profile){
            result = true;
          }else{
            result = false;
          }
        }else{
          new User({
            slack_id: message.user,
            slack_name: slackUsername.name,
            slack_email: slackUsername.profile.email,
            // slack_dmid: //here
          }).save(function(err, user){
            console.log("save success");
          });
          result = false;
        }
      })
      .then(function(resp) {
        if (result === false && response.data.result.fulfillment.speech.includes('https://4325b7f9.ngrok.io/connect')) {
          var finalmessage = "Welcome to Scheduler Bot! Please go to " + process.env.CONNECT_URL + '/connect?auth_id=' + message.user;
          rtm.sendMessage(finalmessage, message.channel);
          return;
        } else if(response.data.result.fulfillment.speech.includes('https://4325b7f9.ngrok.io/connect')){
          rtm.sendMessage('Hello! You are already logged in to Google!', message.channel);
          return;
        }
        if(!response.data.result.fulfillment.speech.includes('Welcome to Scheduler Bot!')) {
          if(response.data.result.fulfillment.speech.includes('Okay! Scheduling')) {
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
                      "name": "confirm task",
                      "text": "Yes",
                      "type": "button",
                      "value": "yes",
                      "confirm": {
                        "title": "Are you sure you want to add this task?",
                        "text": "This will add a calendar reminder to your google account",
                        "ok_text": "Yes",
                        "dismiss_text": "No"
                      }
                    },
                    {
                      "name": "confirm task",
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
        } else if(response.data.result.fulfillment.speech.includes('Alright! Scheduling')) {
          web.chat.postMessage(message.channel,
            "Does this look good?",
            { "attachments": [
              {
                "text": response.data.result.fulfillment.speech,
                "fallback": "Error",
                "callback_id": "confirm_meeting",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                  {
                    "name": "confirm meeting",
                    "text": "Yes",
                    "type": "button",
                    "value": "yes",
                    "confirm": {
                      "title": "Are you sure you want to add this meeting?",
                      "text": "This will add a calendar reminder to your google account",
                      "ok_text": "Yes",
                      "dismiss_text": "No"
                    }
                  },
                  {
                    "name": "confirm meeting",
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
      } else {
        rtm.sendMessage(response.data.result.fulfillment.speech, message.channel);
      }
    }
  })
})

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
  //if (req.token !== process.env.VERIFICATION_TOKEN) console.log("Bad message!");
  //else {
  var answer = JSON.parse(req.body.payload);
  //console.log('answer', answer);
  if(answer.callback_id === 'time_selection') {
    console.log(responseJSON.data.result)
    var time = answer.actions[0].selected_options[0].value;
    time = new Date(time); var endtime = new Date();

    starttime = new Date(time.getTime());
    endtime.setTime(starttime.getTime() + 3600000);
    console.log('start time:', starttime)
    console.log('end time:', endtime)
    var attendeesFinal = [];
    responseJSON.data.result.parameters.invitees.forEach(function(item) {
      if(item.includes('.')){
        item = item.slice(0, -1);
      }
      attendeesFinal.push(item.slice(2, item.length));
    })
    console.log('attendees', attendeesFinal)

    var summary = responseJSON.data.result.parameters.subject;
    console.log('summary:', summary)
    var attendeesEmail = [];
    var meetingOrganizer;
    User.find()
    .then(function(allUsers) {
      allUsers.forEach(function(user) {
        if(user.slack_id === answer.user.id){
          meetingOrganizer = user;
        }else{
          attendeesFinal.forEach(function(id){
            if(user.slack_id === id){
              var userObj = {
                email: user.slack_email,
              }
              attendeesEmail.push(userObj);
            }
          });
        }
      })
      console.log('meetingOrganizer:', meetingOrganizer)
      console.log('attendeesEmail:', attendeesEmail)
      addMeetings(starttime, endtime, attendeesEmail, summary, meetingOrganizer.google_profile);
      new Meeting({
        startTime: startdatetime,
        endTime: enddatetime,
        invitees: attendeesEmail,
        subject: summary,
      }).save(function(error) {
        if(error) console.log('ERRORRRRRRRRRRRRRR', error)
        if(!error) {
          console.log('successfully saved meeting to database!');
        }
      })
    })
    // var users;
    // User.find()
    // .then(function(foundUsers){
    //   users = foundUsers;
    //   if(users.length === 0) {
    //     res.send('Unable to find that user. Make sure the user specified linked their Google account.')
    //   }
    //   var promises = [];
    //   var freeBusyPromises = users.map(function(user) {
    //     if (attendeesFinal.includes(user.slack_id)) {
    //       promises.push(checkFreeBusy(startdatetime, user.slack_email, user.google_profile));
    //     }
    //   })
    //   console.log('promises', promises)
    //
    //   return Promise.all(promises);
    // })
    // .then(function(freeBusyResult) {
    //   console.log('SYED:', freeBusyResult)
    //   if (!freeBusyResult[0]) {
    //     // add meeting, do normal stuff
    //     var attendeesEmail = [];
    //     var meetingOrganizer;
    //     users.forEach(function(user) {
    //       if(user.slack_id === answer.user.id){
    //         meetingOrganizer = user;
    //       }else{
    //         attendeesFinal.forEach(function(id){
    //           if(user.slack_id === id){
    //             var userObj = {
    //               email: user.slack_email,
    //             }
    //             attendeesEmail.push(userObj);
    //           }
    //         });
    //       }
    //     })
    //
    //     addMeetings(startdatetime, enddatetime, attendeesEmail, summary, meetingOrganizer.google_profile);
    //     new Meeting({
    //       startTime: startdatetime,
    //       endTime: enddatetime,
    //       invitees: attendeesEmail,
    //       subject: summary,
    //     }).save(function(error) {
    //       if(error) console.log('ERRORRRRRRRRRRRRRR', error)
    //       if(!error) console.log('successfully saved meeting to database!');
    //     })
    //
    //       responseJSON = null;
    //       res.send('Taken care of!');
    //     }
    //   })
    }

    if (answer.actions[0].value === 'yes') {
      if(answer.actions[0].name === 'confirm task') {
        var splitted = answer.original_message.attachments[0].text.split(' ');
        splitted.splice(0, 5);
        var day = splitted.pop(); splitted.pop();
        var subject = splitted.join(' ');
        console.log('subject: ', subject);
        console.log('day: ', day);
        User.find({slack_id: answer.user.id})
        .exec(function(err, user){
          console.log("USER", user);
          if(user.length > 0){
            addAllDayEvents(day, subject, user[0].google_profile);
            new Reminder({
              time: day,
              subject: subject,
              user: user[0],
            }).save(function(err){ if(!err) console.log('successfully saved an all day event!') })
            res.send('Taken care of!')
          }else{
            console.log('cannot find user');
          }
        })
      }

      if(answer.actions[0].name === 'confirm meeting') {
        var splitted = answer.original_message.attachments[0].text.split(' ');
        // console.log('splitted', splitted);
        var dateString = splitted[5]
        var timeString = splitted[7];
        var startdatetime = new Date(dateString + ' ' + timeString);
        var enddatetime =  new Date(dateString + ' ' + timeString);
        enddatetime.setTime(enddatetime.getTime() + 3600000);
        startdatetime.setTime(startdatetime.getTime())
        console.log('startdatetime: ', startdatetime)
        console.log('enddatetime: ', enddatetime)

        var attendees1 = [];
        splitted.forEach(function(item) {
          if(item.includes('@')) {
            attendees1.push(item);
          }
        })
        var attendeesFinal = [];
        attendees1.forEach(function(item) {
          if(item.includes('.')){
            item = item.slice(0, -1);
          }
          attendeesFinal.push(item.slice(5, item.length));
        })

        AllHasAccess(attendeesFinal).then(function(results) {
          console.log('trying promise!!!', results);
        })

        //------------------------------------------------------------------------------------------------------

        var summary = responseJSON.data.result.parameters.subject;
        console.log('summary', summary)

        var users;
        User.find()
        .then(function(foundUsers){
          users = foundUsers;
          if(users.length === 0) {
            res.send('Unable to find that user. Make sure the user specified linked their Google account.')
          }
          var promises = [];
          var freeBusyPromises = users.map(function(user) {
            if (attendeesFinal.includes(user.slack_id)) {
              promises.push(checkFreeBusy(startdatetime, user.slack_email, user.google_profile));
            }
          })

          return Promise.all(promises);
        })
        .then(function(freeBusyResult) {
          console.log('SYED:', freeBusyResult)
          if (!freeBusyResult[0]) {
            // add meeting, do normal stuff
            var attendeesEmail = [];
            var meetingOrganizer;
            users.forEach(function(user) {
              if(user.slack_id === answer.user.id){
                meetingOrganizer = user;
              }else{
                attendeesFinal.forEach(function(id){
                  if(user.slack_id === id){
                    var userObj = {
                      email: user.slack_email,
                    }
                    attendeesEmail.push(userObj);
                  }
                });
              }
            })

            addMeetings(startdatetime, enddatetime, attendeesEmail, summary, meetingOrganizer.google_profile);
            new Meeting({
              startTime: startdatetime,
              endTime: enddatetime,
              invitees: attendeesEmail,
              subject: summary,
            }).save(function(error) {
              if(error) console.log('ERRORRRRRRRRRRRRRR', error)
              if(!error) console.log('successfully saved meeting to database!');})

              responseJSON = null;
              res.send('Taken care of!');
            }
            else {
              // suggest alternate times
              console.log("freeBusyResult", freeBusyResult)
              var resultTime = findConflict(startdatetime, enddatetime, freeBusyResult);
              res.send('There is conflict! Please select an available time below.');
              var options = suggestTimes(resultTime)
              console.log("options", options)
              options = options.map(item => {
                var newStart = new Date(item.start).toLocaleString();
                var newEnd = new Date(item.end).toLocaleTimeString();
                return {text: newStart + ' - ' + newEnd, value: item.start}
              });
              web.chat.postMessage(channel,
                "These times are available for all your invitees",
                { "attachments": [
                  {
                    "text": "Choose a date and time",
                    "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
                    "color": "#3AA3E3",
                    "attachment_type": "default",
                    "callback_id": "time_selection",
                    "actions": [
                      {
                        "name": "times_list",
                        "text": "Pick a time...",
                        "type": "select",
                        "options": options
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
        .catch(function(err){
          console.log(err);
        })
      }

    } else {
      responseJSON = null;
      res.send('Ok!');
    }
    //}
  })

  var port = process.env.PORT || 3000;
  app.listen(port);
  console.log('Express started. Listening on port %s', port);

  module.exports = app;
