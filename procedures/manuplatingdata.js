const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");

/**
 * @param {object} data origin and target data
 * @param {object} config procedure configuration
 * @param {string} config.from location of Array of objects
 * @param {string} config.fromFeild relative location of field to evaluate
 * @param {string} config.operation operation to be done on target : "+", "*"
 * @param {string} config.conditionPath relative location of condition field
 * @param {string|number|boolean} config.conditionValue value to compaire condition field with
 * @param {string} config.conditionRule condition Rules : 'eq', 'gt','lt'
 * @param {string} config.targetPath array sibling field to insert result
 * @param {string?} config.targetObject result object like origin or target
 */
const groupToSibling = function groupToSibling(data, config) {
  try {
    let positions = getPositions(data, config.from);
    if (!positions.length) throw new Error("no array in position");
    config.conditionRule = config.conditionRule || "eq";
    config.operation = config.operation || "+";
    positions.forEach(p => {
      let sib =
        (config.targetObject ||
          config.from.slice(0, config.from.indexOf("."))) +
        p.slice(0, p.lastIndexOf(".") + 1).slice(p.indexOf(".")) +
        config.targetPath;

      let resultvalues = _.get(data, p).reduce((car, ar, i) => {
        let conditionval = _.get(
          data,
          p + ".[" + i + "]." + config.conditionPath
        );
        if (
          (config.conditionRule == "eq" &&
            conditionval == config.conditionValue) ||
          (config.conditionRule == "gt" &&
            conditionval > config.conditionValue) ||
          (config.conditionRule == "lt" && conditionval < config.conditionValue)
        ) {
          car.push(_.get(data, p + "[" + i + "]." + config.fromFeild));
          console.log(p + ".[" + i + "]." + config.targetPath);
        }
        return car;
      }, []);
      console.log(resultvalues);
      let result;
      if (["-", "/", "%"].includes(config.operation)) {
        let firstval = parseFloat(resultvalues.shift());
        result = resultvalues.reduce(
          (cr, r) =>
            config.operation == "-"
              ? cr - parseFloat(r)
              : config.operation == "/"
              ? cr / parseFloat(r)
              : cr % parseFloat(r),
          firstval
        );
      } else if (["+", "*"].includes(config.operation)) {
        result = resultvalues.reduce(
          (cr, r) =>
            config.operation == "+" ? cr + parseFloat(r) : cr * parseFloat(r),
          config.operation == "+" ? 0 : 1
        );
      }
      _.set(data, sib, result);
    });
    return false;
  } catch (e) {
    return e;
  }
};

module.exports = {
  groupToSibling
};
