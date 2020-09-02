require('es6-promise').polyfill()
require('isomorphic-fetch')
const cli = require('cac')()
const { google } = require('googleapis')
const fs = require('fs')
const readline = require('readline')

const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
]
const TOKEN_PATH = 'token.json';


function getUrl(site, key, strategy) {
  const parameters = {
    url: encodeURIComponent(site),
    key: key,
    strategy: strategy
  }
  let query = `${API}?`
  for (key in parameters) {
    query += `&${key}=${parameters[key]}`
  }
  return query
}

function authorize(config, callback, data) {
  const { clientId, clientSecret } = config;
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, data, config);
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function write(auth, data, config) {
  const sheets = google.sheets({ version: 'v4', auth })
  sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: config.sheetName,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      'majorDimension': 'ROWS',
      'values': [[
        data.lighthouseResult.audits['first-contentful-paint'].numericValue / 1000,
        data.lighthouseResult.audits['speed-index'].numericValue / 1000,
        data.lighthouseResult.audits['interactive'].numericValue / 1000,
        data.lighthouseResult.audits['first-meaningful-paint'].numericValue / 1000,
        data.lighthouseResult.audits['first-cpu-idle'].numericValue / 1000,
        data.lighthouseResult.audits['estimated-input-latency'].numericValue / 1000
      ]]
    }
  })
    .then(function (response) {
      console.log('Data written to spreadsheet!')
    }, function (reason) {
      console.log('error: ' + reason)
    });
}

function run(site, strategy) {
  fs.readFile('config.json', (err, content) => {
    if (err) {
      console.log('Error loading config file:', err)
      return
    }
    const config = JSON.parse(content)

    const url = getUrl(site, config.pagespeedToken, strategy)
    fetch(url)
      .then(response => response.json())
      .then(json => {
        authorize(config, write, json)
    })
  });
}

cli.option('--strategy <strategy>', 'Choose strategy (mobile, desktop)', {
  default: 'mobile'
})

cli.help()
cli.version('0.0.1')

const parsed = cli.parse()
run(parsed.args[0], parsed.options.strategy)
