const feildActions = require('./procedures/feildactions')
const manipulatingData = require('./procedures/manuplatingdata')
const config = require('./config')
module.exports = {
  ...feildActions,
  ...manipulatingData,
  config
}