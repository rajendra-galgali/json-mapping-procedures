const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");
const { parser, arrayParser } = require("../helpers");

/**
 * @param {object} data origin and target data
 * @param {object} config procedure configuration
 * @param {string} config.from location of Array of objects to pivot
 * @param {string} config.groupBy relative location of feild to groupby
 * @param {string} config.field relative of fields to operate
 * @param {[string]|string} config.operation (sum | count | array) operation to do on fields
 * @param {string} config.to location of output
 * @param {string?} config.toGroupByField location of returning object
 * @param {string?} config.toResultField location of returning object
 * @param {string} config.conditionField relative location of condition fields
 * @param {string} config.conditionValue relative location of condition value fields
 * @param {string} config.conditionRelative relative location of condition value fields
 */
const groupBy = function groupBy(data, config) {
  try {
    let tolessthenfrom = false;
    let orgto = config.to;
    if (
      (config.to.match(/\[\]/g) || []).length <
      (config.from.match(/\[\]/g) || []).length
    ) {
      tolessthenfrom = true;
      if (orgto.slice(-2) != "[]") orgto = orgto + "[]";
    }
    // find operations
    let opt = config.operation || "array";
    let operations = (opt.match(/sum|array|count/g) || []).length;
    let optarray = (opt.match(/array/g) || []).length;
    let optsum = (opt.match(/sum/g) || []).length;
    let optcount = (opt.match(/count/g) || []).length;

    let conditionValus;
    let condvalupaths = arrayParser(config.conditionValue);
    if (config.conditionField && !config.conditionRelative) {
      conditionValus = condvalupaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
        }, []);
    }
    let positions = getPositions(data, config.from);
    if (!positions.length) throw new Error("no array in position");
    positions.forEach((p, ri) => {
      let arrayobject = _.get(data, p);
      let resultObject = {};
      arrayobject.forEach(ob => {
        getPositions(ob, config.groupBy).forEach(gb => {
          let gbval = (_.get(ob, gb) || "undefined").toString();
          let gbindexarray = gb.match(/\[[0-9]+\]/) || [];
          let fields = getPositions(
            ob,
            gbindexarray.reduce(
              (cu, ind) => cu.replace("[]", ind),
              config.field
            )
          );
          if (config.conditionField) {
            if (config.conditionRelative) {
              conditionValus = condvalupaths
                .reduce(
                  (cu, c) => [
                    ...cu,
                    gbindexarray.reduce((cu, cin) => cu.replace("[]", cin), c)
                  ],
                  []
                )
                .reduce((cu, c) => {
                  let d = _.get(data, c);
                  return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
                }, []);
            }
            fields = fields.filter(f =>
              conditionValus.includes(
                _.get(
                  ob,
                  (f.match(/\[[0-9]+\]/) || []).reduce(
                    (cu, ind) => cu.replace("[]", ind),
                    config.conditionField
                  )
                )
              )
            );
          }
          if (operations > 1) {
            resultObject[gbval] = resultObject[gbval] || {};
            if (optsum) {
              resultObject[gbval].sum = resultObject[gbval].sum || 0;
              fields.forEach(
                f => (resultObject[gbval].sum += parseFloat(_.get(ob, f)))
              );
            }
            if (optcount) {
              resultObject[gbval].count = resultObject[gbval].count || 0;
              fields.forEach(f => (resultObject[gbval].count += 1));
            }
            if (optarray) {
              resultObject[gbval].array = resultObject[gbval].array || [];
              fields.forEach(f => resultObject[gbval].array.push(_.get(ob, f)));
            }
          } else {
            if (optsum) {
              resultObject[gbval] = resultObject[gbval] || 0;
              fields.forEach(
                f => (resultObject[gbval] += parseFloat(_.get(ob, f)))
              );
            }
            if (optcount) {
              resultObject[gbval] = resultObject[gbval] || 0;
              fields.forEach(f => (resultObject[gbval] += 1));
            }
            if (optarray) {
              resultObject[gbval] = resultObject[gbval] || [];
              fields.forEach(f => resultObject[gbval].array.push(_.get(ob, f)));
            }
          }
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
              [toResultField]: resultObject[c]
            }
          ];
        }, []);
      }

      let to = (p.match(/\[[0-9]+\]/g) || []).reduce(
        (cu, ind) => cu.replace("[]", ind),
        orgto
      );

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
        let curvalue;
        if (tolessthenfrom) {
          to = to.replace(/\[([0-9]+)\]+$/, "");
          curvalue = _.get(data, to);
          if (!curvalue) return _.set(data, to, [resultObject]);
          return curvalue.push(resultObject);
        }
        curvalue = _.get(data, to);
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

    let conditionValus;
    let condvalupaths = arrayParser(config.conditionValue);
    if (config.conditionField && !config.conditionRelative) {
      conditionValus = condvalupaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
        }, []);
    }
    // loop through from and to
    for (let i = 0; i < origin.length; i++) {
      let org = origin[i];
      let des = destination[i];
      let positions = getPositions(data, org);
      if (!positions.length) throw new Error("no data in position");
      positions.forEach(p => {
        if (config.conditionField) {
          let indexarray = p.match(/\[[0-9]+\]/g) || [];
          if (config.conditionRelative) {
            conditionValus = condvalupaths
              .reduce(
                (cu, c) => [
                  ...cu,
                  indexarray.reduce((cu, cin) => cu.replace("[]", cin), c)
                ],
                []
              )
              .reduce((cu, c) => {
                let d = _.get(data, c);
                return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
              }, []);
          }
          if (
            !conditionValus.includes(
              _.get(
                data,
                indexarray.reduce(
                  (cu, c) => cu.replace("[]", c),
                  config.conditionField
                )
              )
            )
          )
            return;
        }

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
  groupBy,
  lookup,
  flatten
};
