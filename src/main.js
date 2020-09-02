require('es6-promise').polyfill()
require('isomorphic-fetch')
const cli = require('cac')()

const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

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

function run(site, key, strategy) {
  const url = getUrl(site, key, strategy)
  fetch(url)
    .then(response => response.json())
    .then(json => {
      console.log(json)
    })
}


cli.option('--strategy <strategy>', 'Choose strategy (mobile, desktop)', {
  default: 'mobile'
})
cli.option('--key <key>', 'Add your google PageSpeed Insights API Key, see: https://bit.ly/3hVOxyg', {
})

cli.help()
cli.version('0.0.1')

const parsed = cli.parse()
console.log(parsed)
run(parsed.args[0], parsed.options.key, parsed.options.strategy)
