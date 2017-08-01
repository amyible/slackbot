var express = require('express');
var router = express.Router();

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var User = require('./models/models');


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

//somewhere here we are going to do
var slackId; //get the slack id of the person who is talking to the slack bot
User.find({slack_id: slackId}, function(err, user){
    if(user){
      //if the google_profile is not empty, send the request to API.AI
      //else send a URL to user to authorize Google Calendar like the case in the else statement below
    }else{
      new User({
          slack_id: slackId,
          slack_name: slackName, //slack username of the person who is talking to the slack bot
          google_profile: {} //empty for now
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
  console.log('url', url);
  //redirecting to the google oauth url
  res.redirect(url);
})

//get callback route
router.get('/success', function(req, res) {
  oauth2Client.getToken(req.query.code, function(err, tokens) {
    if(!err){
        oauth2Client.setCredentials(tokens);

        console.log('tokens', tokens); //tokens is an object that contains 'access_token', 'id_token', 'refresh_token', 'token_type' and 'expiry_date'
        //get the auth_id using JSON.parse(decodeURIComponent(req.query.state));
        //I don't know what state is right now so this is incomplete code
        const auth_id = JSON.parse(decodeURIComponent(req.query.state));
        console.log('query', auth_id);

        //update the user document with new google_profile
        //don't know if this syntax works
        User.findByIdAndUpdate(auth_id, {
          $set: {google_profile: tokens}
        }, function(err){
          if(!err) {
            console.log("no error! update success!");
          }
        })
    }else{
      console.log('error', err);
    }
  })

  res.send('you are successfully logged in!')
})


module.exports = router;
