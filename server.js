'use strict'
const express = require('express')
const path = require('path')
const app = express()
const bodyParser = require('body-parser')
const tinder = require('tinderjs')
const client = new tinder.TinderClient()
const compression = require('compression')
  // heroku port or default to 3000
const port = process.env.PORT || 3000

// use morgan for server loggin in development
if (!process.env.PORT) {
  app.use(require('morgan')('dev'))
}

app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, './app')))
app.listen(port, () => console.log(`listening on port ${port}`))


// compression
const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  }
  // fallback to standard filter function
  return compression.filter(req, res)
}
app.use(compression({
  filter: shouldCompress
}));

// middleware
const authorize = (req, res, next) => {
  console.log('middleware: authorize and store user info')
  let fb_id = req.body.fb_id || null // 658697848
  let fb_ut = req.body.fb_ut || null
  if (fb_ut === null || fb_id === null) {
    return res.sendStatus(400)
  }
  client.authorize(fb_ut, fb_id, (err, body) => {
    if (body !== null) {
      req.userProfile = body
      next()
    } else {
      return res.sendStatus(400)
    }
  })
}

const grabMatches = (req, res, next) => {
  console.log('middleware: get Matches and store info')
  client.getHistory((error, data) => {
    if (error) {
      return res.sendStatus(400)
    }
    if (data) {
      console.log('successfully retrieved match history')
      let arrayOfMatchObjs = []
      data.matches.forEach(function(match) {
        if (match.person) {
          arrayOfMatchObjs.push(match)
        }
      })
      req.userMatches = arrayOfMatchObjs
      console.log(arrayOfMatchObjs.length + ' total matches for ' + req.userProfile.user.name)
      next()
    }
  })
}

const returnData = (req, res) => {
  console.log('middleware: send back the data to client')
  res.send(JSON.stringify({
    userProfile: req.userProfile,
    userMatches: req.userMatches
  }))
}

// main route
app.get('/', (req, res) => res.sendFile('/app/index.html'))

// user authentication route
app.post('/auth', authorize, grabMatches, returnData)
