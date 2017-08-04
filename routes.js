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
        User.update({slack_id: auth_id}, {
          $set: {google_profile: tokens}
        }, function(err, user){
          if(!err) {
            console.log("no error! update success!");
            console.log('user', user);
          }
        })
    }else{
      console.log('error', err);
    }
  })
  res.send('you are successfully logged in!')
})

function addAllDayEvents(date, summary, token) {
  if(token.expiry_date < new Date()){
    oauth2Client.setCredentials(token);
    oauth2Client.refreshAccessToken(function(err, tokens) {
        console.log('token refreshed');
    });
  }else{
    oauth2Client.setCredentials(token);
  }
  var calendar = google.calendar('v3');
  var event = {
    'summary': summary,
    'start': {
      'date': date,
       timezone: 'America/Los_Angeles',
    },
    'end': {
      'date': date,
       timezone: 'America/Los_Angeles',
    },
  };
  calendar.events.insert({
    auth: oauth2Client,
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
function addMeetings(startDateTime, endDateTime, attendees, summary, token) {
  startDateTime.toISOString();
  endDateTime.toISOString();

  if(token.expiry_date < new Date()){
    oauth2Client.setCredentials(token);
    oauth2Client.refreshAccessToken(function(err, tokens) {
        console.log('token refreshed');
    });
  }else{
    oauth2Client.setCredentials(token);
  }

  var calendar = google.calendar('v3');
  var event = {
    'summary': summary,
    'start': {
      'dateTime': startDateTime,
       timezone: 'America/Los_Angeles',
    },
    'end': {
      'dateTime': endDateTime,
       timezone: 'America/Los_Angeles',
    },
    "attendees": attendees,
  };
  calendar.events.insert({
    auth: oauth2Client,
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

function checkFreeBusy(startTime, day, email, token){
  var start = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDay());
  var end = new Date(startTime.getFullYear(), startTime.getMonth(), (startTime.getDay() + day));
  return new Promise(function(resolve, reject) {
    var calendar = google.calendar('v3');
    if(token.expiry_date < new Date()){
      oauth2Client.setCredentials(token);
      oauth2Client.refreshAccessToken(function(err, tokens) {
        if (err) {
          reject(err);
          return;
        }
          console.log('token refreshed');
      });
    }else{
      oauth2Client.setCredentials(token);
    }
    var resource = {
      timeMax: end.toISOString(),
      timeMin: start.toISOString(),
      timeZone: "America/Los_Angeles",
      items: [
        {
          id: email,
        },
      ],
    }
    calendar.freebusy.query({
      auth: oauth2Client,
      headers: { "content-type" : "application/json" },
      resource: resource,
    }, function(err, resp){
        if (err) {
          console.log('There was an error contacting the Calendar service: ' + err);
          reject(err);
          return;
        }
        for(var key in resp.calendars){
          console.log(resp.calendars[key].busy);
          var events = resp.calendars[key].busy;
          if (events.length == 0) {
              console.log('No upcoming events found for ' + key);
              resolve(null);
          } else {
              console.log(key + ' is busy in here...');
              resolve(events);
          }
        }
      });
  });
}


module.exports = {
  router,
  addAllDayEvents,
  addMeetings,
  checkFreeBusy,
};
