const express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var path = require('path');
var request = require('request');
const app = express();
const port = 8002;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested With, Content-Type, Accept');
   next();
});

//Homepage endpoint
app.get('/', (req, res) => {
  res.render('homepage', {mileage: null, id: null, name: null})
});

// Endpoint that strava redirects to after authorizing user
app.get('/exchange_token', (req, res) => {

  var requestTokenString = `client_id=57570&client_secret=eb621b27c0d211564b6342019b68ad90e811b963&code=${req.query.code}&grant_type=authorization_code`;

  var options = {
      url: 'https://www.strava.com/api/v3/oauth/token',
      method: 'POST',
      body: requestTokenString
  };

  // First call to receive authorization token for user.
  function requestToken(error, response, body) {
      if (!error && response.statusCode == 200) {
          var data = JSON.parse(body);
          var firstname = data.athlete.firstname
          var lastname = data.athlete.lastname
          var name = firstname + " " + lastname
          var activityOptions = {
            url: `https://www.strava.com/api/v3/athlete/activities?access_token=${data.access_token}`,
            method: 'GET'
          }
          // Second call to receive latest rides from user.
          function getActivities(error, response, body) {
              var rides = JSON.parse(body);
              var mileage = rides[0].distance;
              var id = rides[0].id;
              res.render('homepage', {mileage: mileage, id: id, name: name})
          }
          request(activityOptions, getActivities);
      }
  }

  request(options, requestToken);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
