var apiai = require('apiai');

var app = apiai("0363b04fac5d44899aa10b88294aa6cc");

var request = app.textRequest('<Your text query>', {
    sessionId: '<unique session id>'
});

request.on('response', function(response) {
    console.log(response);
});

request.on('error', function(error) {
    console.log(error);
});

request.end();


// AIpost should output a body like:
/*
{
    "query": [
        "and for tomorrow"
    ],
    "contexts": [{
        "name": "weather",
        "lifespan": 4
    }],
    "location": {
        "latitude": 37.459157,
        "longitude": -122.17926
    },
    "timezone": "America/New_York",
    "lang": "en",
    "sessionId": "1234567890"
}
*/
function AIpost() {
  return axios.post('https:api.api.ai/api/query?v=20150910', {
    Headers: {
      query: message.text,
      lang: en,
      sessionId: message.user,
      timezone: new Date().getTimezoneOffset(),
    },
    Authorization: 'Bearer' token, // This should be the slack api token
    Content-Type: 'application/json',
  })
}
