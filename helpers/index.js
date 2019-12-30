const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");

const parser = function parser(variable) {
  let result;
  try {
    result = JSON.parse(variable);
  } catch (e) {
    result = variable;
  }
  return result;
};

const arrayParser = function arrayParser(variable) {
  let result = parser(variable);
  return Array.isArray(result) ? result : [result];
};

const getArrPos = function getArrPos(data, pos) {
  let result = [];
  let i = 0;
  arrayParser(pos).forEach(p => {
    getPositions(data, p).forEach(pos => (result[i++] = pos));
  });
  return result;
};

const conGetValues = function conGetValues(data, config, condvaluepaths) {
  let convals = [];
  if (config.conditionField && !config.conditionRelative) {
    let condvalupaths = condvaluepaths || arrayParser(config.conditionValue);
    let i = 0;
    condvalupaths.forEach(c => {
      getPositions(data, c).forEach(p => {
        let d = _.get(data, p);
        if (Array.isArray(d)) {
          d.forEach(v => {
            let val = Number(v);
            convals[i++] = isNaN(val) ? v : val;
          });
        } else {
          let val = Number(d);
          convals[i++] = isNaN(val) ? d : val;
        }
      });
    });
  }
  return convals;
};

const conChecker = function conChecker(
  data,
  config,
  path,
  conValues = [],
  conValuPaths
) {
  if (config.conditionField) {
    let addArrInd = path.match(/\[[0-9]+\]/g) || [];
    if (config.conditionRelative) {
      conValues = [];
      let i = 0;
      (conValuPaths || arrayParser(config.conditionValue)).forEach(p => {
        addArrInd.reduce((cu, cin) => cu.replace("[]", cin), c);
        let d = _.get(data, c);
        if (Array.isArray(d)) {
          d.forEach(v => {
            let val = Number(v);
            conValues[i++] = isNaN() ? v : val;
          });
        } else {
          let val = Number(d);
          conValues[i++] = isNaN(val) ? d : val;
        }
      });
    }
    let conval = _.get(
      data,
      addArrInd.reduce((cu, c) => cu.replace("[]", c), config.conditionField)
    );
    return conValues.includes(!isNaN(Number(conval)) ? Number(conval) : conval);
  } else {
    return true;
  }
};

module.exports = {
  parser,
  arrayParser,
  getArrPos,
  conGetValues,
  conChecker
};
