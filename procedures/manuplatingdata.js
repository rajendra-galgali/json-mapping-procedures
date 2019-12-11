const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");
const { parser, arrayParser } = require("../helpers");
/**
 * @param {object} data origin and target data
 * @param {object} config procedure configuration
 * @param {string} config.from location of Array of objects
 * @param {string} config.fromFeild relative location of feild to evaluate
 * @param {string} config.operation operation to be done on target : "+", "*"
 * @param {string} config.conditionPath relative location of condition feild
 * @param {string|number|boolean} config.conditionValue value to compaire condition feild with
 * @param {string} config.conditionRule condition Rules : 'eq', 'gt','lt'
 * @param {string} config.targetPath array sibling feild to insert result
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
          car.push(_.get(data, p + ".[" + i + "]." + config.targetPath));
        }
        return car;
      }, []);
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
    console.error(e);
    return e;
  }
};
/**
 * @param {object} data origin and target data
 * @param {object} config procedure configuration
 * @param {string} config.from location of Array of objects
 * @param {string} config.groupBy relative location of feild to evaluate
 * @param {[string]|string} config.feilds relative to groupby parent field
 * @param {string} config.to location of Array of objects
 */
const groupBy = function groupBy(data, config) {
  try {
    if (config.to.match("[]") != config.from.match("[]"))
      throw new Error(
        "to field should have same number of array as from field"
      );
    let positions = getPositions(data, config.from);
    if (!positions.length) throw new Error("no array in position");
    let feilds = Array.isArray(config.feilds) ? config.feilds : [config.feilds];
    let finalresult = [];
    positions.forEach(p => {
      let arrayobject = _.get(data, p);
      let resultObject = {};
      arrayobject.forEach(ob => {
        let gb = config.groupBy;
        let gbval = _.get(ob, gb).toString();
        let currentresult = resultObject[gbval];
        if (!currentresult) currentresult = resultObject[gbval] = {};
        let fieldsParent = gb.slice(0, gb.lastIndexOf(".") + 1);
        _.flattenDeep(
          feilds.map(f => getPositions(ob, fieldsParent + f))
        ).forEach(f => {
          let fval = _.get(ob, f);
          let fname = f.slice(f.lastIndexOf("."));
          if (currentresult[fname]) currentresult[fname].push(fval);
          else currentresult[fname] = [fval];
        });
      });
      finalresult.push({ arrayaddress: p, resultObject });
    });
    finalresult.forEach(fo => {
      let rov = fo.resultObject;
      let ro = fo.arrayaddress;
      let to = config.to;
      let arnum = ro.match(/\[[0-9]+\]/g);
      arnum.forEach(ind => {
        to = to.replace("[]", ind);
      });
      _.set(data, to, rov);
    });
    return false;
  } catch (e) {
    console.error(e);
    return e;
  }
};

/**
 * @param {object} data origin and target data
 * @param {object} config procedure configuration
 * @param {string} config.from location of Array of objects
 * @param {string} config.groupBy relative location of feild to evaluate
 * @param {string} config.field relative to groupby parent field
 * @param {string?} config.to location of returning object
 * @param {string?} config.toGroupByField location of returning object
 * @param {string?} config.toResultField location of returning object
 */
const groupBySum = function groupBySum(data, config) {
  try {
    let toarraylen = (config.to.match(/\[\]/g) || []).length;
    let fromarraylen = (config.from.match(/\[\]/g) || []).length;
    let orgto = config.to;
    if (toarraylen < fromarraylen) {
      for (let i = 1; i <= fromarraylen - toarraylen; i++) {
        orgto = orgto + "[]";
      }
    }

    let positions = getPositions(data, config.from);
    if (!positions.length) throw new Error("no array in position");
    positions.forEach((p, ri) => {
      let arrayobject = _.get(data, p);
      let resultObject = {};
      arrayobject.forEach(ob => {
        getPositions(ob, config.groupBy).forEach(gb => {
          let gbval = (_.get(ob, gb) || "undefined").toString();
          resultObject[gbval] = resultObject[gbval] || 0;
          let fieldsParent = gb.slice(0, gb.lastIndexOf(".") + 1);
          getPositions(ob, fieldsParent + config.field).forEach(f => {
            return (resultObject[gbval] += parseFloat(_.get(ob, f)));
          });
        });
      });
      if (config.toGroupByField || config.toResultField) {
        let toGroupByField =
          config.toGroupByField ||
          config.field.slice(config.field.lastIndexOf("."));
        let toResultField =
          config.toResultField ||
          config.groupBy.slice(config.groupBy.lastIndexOf("."));

        resultObject = Object.keys(resultObject).reduce((cu, c) => {
          return [
            ...cu,
            {
              [toGroupByField]: c,
              [toResultField]: (resultObject[c] || 0).toString()
            }
          ];
        }, []);
      }
      let to = orgto;
      let arnum = p.match(/\[[0-9]+\]/g);
      if (arnum) arnum.forEach(ind => (to = to.replace("[]", ind)));
      if (to.includes("[]")) {
        to = to.replace(/\[\]/g, "[0]");
        let curvar = _.get(data, to);
        while (curvar) {
          to = to.replace(
            /\[([0-9]+)\]+$/,
            (fm, n) => "[" + (parseInt(n) + 1) + "]"
          );
          curvar = _.get(data, to);
        }
        _.set(data, to, resultObject);
        return;
      } else {
        let curvalue = _.get(data, to);
        if (curvalue) {
          if (Array.isArray(curvalue))
            return (curvalue = Array.isArray(resultObject)
              ? [...curvalue, ...resultObject]
              : [...curvalue, resultObject]);
          else if (typeof curvalue == "object")
            return (curvalue = Array.isArray(resultObject)
              ? { ...curvalue, resultObject }
              : { ...curvalue, ...resultObject });
        }
        _.set(data, to, resultObject);
      }
    });
    return false;
  } catch (e) {
    console.error(e);
    return e;
  }
};

/**
 * @param {object} data origin and target data
 * @param {object} config procedure configuration
 * @param {string} config.from location of Array of objects
 * @param {string} config.groupBy relative location of feild to evaluate
 * @param {string} config.field relative to array
 * @param {string} config.to location of output
 * @param {string?} config.groupByKey location of returning object
 */
const groupByFeild = function groupByFeild(data, config) {
  try {
    let positions = getPositions(data, config.from);
    if (!positions.length) throw new Error("no array in position");
    positions.forEach(p => {
      let arrayobject = _.get(data, p);
      let resultObject = {};
      arrayobject.forEach(ob => {
        let gb = config.groupBy;
        let gbval = config.groupByKey
          ? gb.slice(0, gb.lastIndexOf("."))
          : _.get(ob, gb).toString();
        resultObject[gbval] = resultObject[gbval] || [];
        getPositions(ob, config.field).forEach(f => {
          return resultObject[gbval].push(_.get(ob, f));
        });
      });
      let to = config.to;
      let arnum = p.match(/\[[0-9]+\]/g);
      if (arnum)
        arnum.forEach(ind => {
          to = to.replace("[]", ind);
        });

      _.set(data, to, resultObject);
    });
    return false;
  } catch (e) {
    console.error(e);
    return e;
  }
};

/**
 * @param {object} data data to be manuplated
 * @param {object} config procedure configuration
 * @param {string} config.from location of Array of objects
 * @param {string} config.to location of flatten array
 */
const flatten = function flatten(data, config) {
  try {
    let from = arrayParser(from);
    let to = arrayParser(to);
    let result = from
      .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
      .map(p => _.get(data, p));
    to.reduce((cu, c) => [...cu, ...getPositions(data, c)], []).forEach(p =>
      _.set(data, p, _.flattenDeep(result))
    );
  } catch (e) {
    console.error(e);
    return e;
  }
};

/**
 * @param {object} data data to be manuplated
 * @param {object} config procedure configuration
 * @param {string|[string]} config.from location of input
 * @param {string|[string]} config.to location of output
 * @param {string|[string]} config.lookupFields location of lookingup fields
 * @param {string} config.returningFields location of returning Fields
 */
const lookup = function lookup(data, config) {
  try {
    let origin = arrayParser(config.from);
    let destination = arrayParser(config.to);
    //set to array if string of array

    if (origin.length != destination.length)
      throw new Error("from and to need to have same length");
    let lookupFields = arrayParser(config.lookupFields);

    //get all of the lookup values in one object
    let lookupValues = lookupFields
      .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
      .reduce((cu, c) => {
        let val = _.get(data, c);
        if (Array.isArray(val)) {
          return val.reduce((cus, cc) => ({ ...cus, [cc]: c }), cu);
        } else return { ...cu, [_.get(data, c)]: c };
      }, {});
    // loop through from and to
    for (let i = 0; i < origin.length; i++) {
      let org = origin[i];
      let des = destination[i];
      let positions = getPositions(data, org);
      if (!positions.length) throw new Error("no data in position");
      positions.forEach(p => {
        let lookupValue = _.get(data, p);

        let resultpath = lookupValues[lookupValue] || null;
        let to = des;
        let returningFields = config.returningFields;
        let arrnum = p.match(/\[[0-9]+\]/g);
        if (arrnum)
          arrnum.forEach(ind => {
            to = to.replace("[]", ind);
          });
        let arnum = resultpath ? resultpath.match(/\[[0-9]+\]/g) : null;
        if (arnum)
          arnum.forEach(ind => {
            returningFields = returningFields.replace("[]", ind);
          });
        // returningFields = getPositions(returningFields);
        let resultvalue;
        if (returningFields.includes("[]")) {
          resultvalue = [];
          resultvalue = getPositions(data, returningFields).reduce((cu, p) => {
            return [...cu, _.get(data, p)];
          }, []);
        } else resultvalue = _.get(data, returningFields) || null;
        if (to.includes("[]")) {
          to = to.replace(/\[\]/g, "[0]");
          let curvar = _.get(data, to);
          while (curvar) {
            to = to.replace(
              /\[([0-9]+)\]+$/,
              (fm, n) => "[" + (parseInt(n) + 1) + "]"
            );
            curvar = _.get(data, to);
          }
          _.set(data, to, resultvalue);
          return;
        } else {
          let curvar = _.get(data, to);
          if (curvar && Array.isArray(curvar)) {
            curvar.push(resultvalue);
            return;
          }
          _.set(data, to, resultvalue);
          return;
        }
      });
    }
    return false;
  } catch (e) {
    console.error(e);
    return e;
  }
};

/**
 * @param {object} data data to be manuplated
 * @param {object} config procedure configuration
 * @param {string|[string]} config.positive location of input
 * @param {string|[string]} config.negetive location of output
 * @param {string|[string]} config.to location of lookingup fields
 * @param {string|[string]} config.conditions location of lookingup fields
 * @param {string|[string]} config.conditionsValue location of lookingup fields
 * @param {string|[string]} config.conditionsOperation location of lookingup fields
 */
const sum = function sum(data, config) {
  try {
  } catch (e) {
    console.error(e);
    return e;
  }
};

module.exports = {
  // groupBy,
  // groupToSibling,
  lookup,
  groupBySum,
  groupByFeild,
  flatten
};
