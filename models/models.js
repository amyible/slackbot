var mongoose = require 'mongoose';
var connect = process.env.MONGODB_URI;

var Schema = mongoose.Schema

mongoose.connect(connect);

var userSchema = new Schema({
  slack_id: String,
  slack_name: String,
  google_profile: Object, //saves the token object here
  pending_reminder: Object,
});

var reminderSchema = new Schema({
  time: Date,
  content: String,
})

var User = mongoose.model('User', userSchema);
var Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = {
  User: User,
  Reminder: Reminder,
};
