const mongoose = require('mongoose')

const pokedexSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  pokemon: {
    type: [Number],
    default: undefined,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Pokedex', pokedexSchema)
