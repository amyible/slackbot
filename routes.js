var express = require('express');
var router = express.Router();

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var models = require('./models/models');
var User = models.User;


//part of google oauth set up
var oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);
var scopes = [
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/calendar'
];

// somewhere here we are going to do
var email = "amyible@gmail.com";
var slackId = 1;
var slackName = 1;
 //get the slack id of the person who is talking to the slack bot
User.find({slack_id: slackId}, function(err, user){
    if(user.length !== 0){
      //if the google_profile is not empty, send the request to API.AI
      //else send a URL to user to authorize Google Calendar like the case in the else statement below
      if(user[0].google_profile){
          oauth2Client.setCredentials(user[0].google_profile);
          addAllDayEvents(oauth2Client, '2017-08-01', 'second testing');
          var attendees = [
            {
              "email": "x@gmail.com",
            }
          ];
          listEvents(oauth2Client);
          addMeetings(oauth2Client, '2017-08-01T13:00:00+00:00', '2017-08-01T14:00:00+00:00', attendees, "example meeting");
      }
    }else{
      new User({
          slack_id: slackId,
          slack_name: slackName, //slack username of the person who is talking to the slack bot
      }).save(function(err, user){
        //then use the bot to ask the user to grant you access
        //generate a link like /connect?auth_id=596ad616191fc5ce7e79138e (which is localhost:3000/connect?auth_id=something in this case)
        //when the user click this link, it will redirect to google oauth (specificed in the route below)
        //the auth_id refers to the _id in mongodb database
        //get the id using user.id
      });
    }
})

//this is the route that will redirect to google oauth
router.get('/connect', function(req, res) {
  //setting up google oauth redirect url
  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: encodeURIComponent(JSON.stringify({
      auth_id: req.query.auth_id
    }))
  });
  //redirecting to the google oauth url
  res.redirect(url);
})

//get callback route
router.get('/success', function(req, res) {
  oauth2Client.getToken(req.query.code, function(err, tokens) {
    if(!err){
        oauth2Client.setCredentials(tokens);
        //tokens is an object that contains 'access_token', 'id_token', 'refresh_token', 'token_type' and 'expiry_date'

        //get the auth_id using JSON.parse(decodeURIComponent(req.query.state));
        const stateObj = JSON.parse(decodeURIComponent(req.query.state));
        const auth_id = stateObj.auth_id;
        console.log('query', auth_id);

        // update the user document with new google_profile
        // don't know if this syntax works
        User.findByIdAndUpdate(auth_id, {
          $set: {google_profile: tokens}
        }, function(err, user){
          if(!err) {
            console.log("no error! update success!");
            console.log('user');
          }
        })
    }else{
      console.log('error', err);
    }
  })
  res.send('you are successfully logged in!')
})

function listEvents(auth) {
  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Upcoming 10 events:');
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var start = event.start.dateTime || event.start.date;
        console.log('%s - %s', start, event.summary);
      }
    }
  });
}

function addAllDayEvents(auth, date, summary) {
  var calendar = google.calendar('v3');
  var event = {
    'summary': summary,
    'start': {
      'date': date,
      'timeZone': 'America/Los_Angeles',
    },
    'end': {
      'date': date,
      'timeZone': 'America/Los_Angeles',
    },
  };
  calendar.events.insert({
    auth: auth,
    calendarId: 'primary',
    resource: event,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event created: %s', event.htmlLink);
  });
}

function addMeetings(auth, startDateTime, endDateTime, attendees, summary) {
  var calendar = google.calendar('v3');
  var event = {
    'summary': summary,
    'start': {
      'dateTime': startDateTime,
      'timeZone': 'America/Los_Angeles',
    },
    'end': {
      'dateTime': endDateTime,
      'timeZone': 'America/Los_Angeles',
    },
    "attendees": attendees,
  };
  calendar.events.insert({
    auth: auth,
    calendarId: 'primary',
    resource: event,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Meeting created: %s', event.htmlLink);
  });
}


module.exports = router;
