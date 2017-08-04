var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var models = require('./models/models');
var User = models.User;


function AllHasAccess(invitees) {
  // invitees should be an array!
  return new Promise(function(resolve, reject) {
      User.find()
      .then(function(AllUsers){
        var nonUsers = [];
        AllUsers.forEach(function(user) {
          if(invitees.includes(user.slack_id)){
            if(!('google_profile' in user)){
              nonUsers.push(user);
            }
          }
        })

        if(nonUsers.length === 0) {
          // true means everyone has access.
          resolve(nonUsers);
        } else {
          // false means someone didn't do Oauth access.
          resolve(null);
        }
      })
  }
}

function meetingabove4(timeStart) {
  var onehour = 60*60*1000;
  if(timestart - new Date() >= 4*onehour) {
    // true means that the meeting time is good.
    return true;
  }
  // false means that the meeting is within 5
  return false;
}

function eligibility(invitees, timestart) {
  var timeEligible = meetingabove4(timestart);
  var allaccess = AllHasAccess(invitees);
  if(timeEligible && allaccess) {
    console.log('Everything is cool!');
    return true;
  } else if(!timeEligible && allaccess) {
    console.log('Need to set up a new time!');
  } else if(timeEligible && !allaccess) {
    console.log("Someone doesn't have access!")
  } else if(!timeEligible && !allaccess) {
    console.log('Everything not cool. Time is not eligible and someone does not have access.')
  }
}

export default = {
  eligibility,
}
