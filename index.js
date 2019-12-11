const feildActions = require("./procedures/feildactions");
const manipulatingData = require("./procedures/manuplatingdata");
const metachange = require("./procedures/metachange");
const config = require("./config");
module.exports = {
  ...feildActions,
  ...manipulatingData,
  ...metachange,
  config
};
