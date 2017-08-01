import mongoose from 'mongoose';
var connect = process.env.MONGODB_URI;

var Schema = mongoose.Schema

mongoose.connect(connect);

var userSchema = new Schema({
  slack_id: String,
  slack_name: String,
  google_profile: Object //saves the token object here
});

var User = mongoose.model('User', userSchema);

export default {
  User: User,
};
