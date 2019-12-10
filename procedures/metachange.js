const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.script location to insert new field( array or object )
 */
const CustomFunction =async  function CustomFunction(data, config) {
  try {
    eval(config.script);
  } catch (e) {
    return e;
  }
  return;
};
module.exports = {
  CustomFunction
};