// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for pokedexes
const Pokedex = require('../models/pokedex')

// we'll use this to intercept any errors that get thrown and send them
// back to the client with the appropriate status code
const handle = require('../../lib/error_handler')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `res.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /pokedex
router.get('/pokedex', requireToken, (req, res) => {
  Pokedex.find()
    .then(pokedexes => pokedexes.map(pokedex => pokedex.toObject()))
    // filter so a user cann only get their own saved pokedexes
    .then(pokedexes => pokedexes.filter(pokedex => pokedex.owner.equals(req.user._id)))
    // respond with status 200 and JSON of the pokedexes
    .then(pokedexes => pokedexes.length > 0 ? res.status(200).json({ pokedexes: pokedexes }) : res.status(204).json({ pokedexes: []}))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// SHOW
// GET /pokedex/5a7db6c74d55bc51bdf39793
router.get('/pokedex/:id', requireToken, (req, res) => {
  // req.params.id will be set based on the `:id` in the route
  Pokedex.findById(req.params.id)
    .then(handle404)
    .then(pokedex => {
      requireOwnership(req, pokedex)
      return res.status(200).json({ pokedex: pokedex.toObject() })
    })
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// CREATE
// POST /pokedex
router.post('/pokedex', requireToken, (req, res) => {
  // set owner of new pokedex to be current user
  req.body.pokedex.owner = req.user.id

  console.log(req.body)

  Pokedex.create(req.body.pokedex)
    // respond to succesful `create` with status 201 and JSON of new "pokedex"
    .then(pokedex => {
      res.status(201).json({ pokedex: pokedex.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(err => handle(err, res))
})

// UPDATE
// PATCH /pokedex/5a7db6c74d55bc51bdf39793
router.patch('/pokedex/:id', requireToken, (req, res) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.pokedex.owner

  Pokedex.findById(req.params.id)
    .then(handle404)
    .then(pokedex => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, pokedex)

      // the client will often send empty strings for parameters that it does
      // not want to update. We delete any key/value pair where the value is
      // an empty string before updating
      Object.keys(req.body.pokedex).forEach(key => {
        if (req.body.pokedex[key] === '') {
          delete req.body.pokedex[key]
        }
      })

      // pass the result of Mongoose's `.update` to the next `.then`
      return pokedex.update(req.body.pokedex)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// DESTROY
// DELETE /pokedex/5a7db6c74d55bc51bdf39793
router.delete('/pokedex/:id', requireToken, (req, res) => {
  Pokedex.findById(req.params.id)
    .then(handle404)
    .then(pokedex => {
      // throw an error if current user doesn't own `pokedex`
      requireOwnership(req, pokedex)
      // delete the pokedex ONLY IF the above didn't throw
      pokedex.remove()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

module.exports = router
