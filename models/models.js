var mongoose = require ('mongoose');
var connect = process.env.MONGODB_URI;

var Schema = mongoose.Schema

mongoose.connect(connect);

var userSchema = new Schema({
  slack_id: String,
  slack_name: String,
  slack_email: String,
  slack_dmid: String,
  google_profile: Object, //saves the token object here
  pending_reminder: Object,
});

var reminderSchema = new Schema({
  time: Date,
  subject: String,
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});

var meetingSchema = new Schema({
  startTime: Date,
  endTime: Date,
  invitees: Array,
  subject: String,
});

var User = mongoose.model('User', userSchema);
var Reminder = mongoose.model('Reminder', reminderSchema);
var Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = {
  User: User,
  Reminder: Reminder,
  Meeting: Meeting,
};
