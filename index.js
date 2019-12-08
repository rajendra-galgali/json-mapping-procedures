const feildActions = require('./procedures/feildactions')
const manipulatingData = require('./procedures/manuplatingdata')

module.exports = {
  ...feildActions,
  ...manipulatingData
}