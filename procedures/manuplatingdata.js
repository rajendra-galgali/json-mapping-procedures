const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");
const { parser, arrayParser } = require("../helpers");
const persianDate = require("persian-date");

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
 * @param {*?} config.conditionRelative relativity of location of condition value fields
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
          return Array.isArray(d)
            ? [...cu, ...d.map(v => (!isNaN(Number(v)) ? Number(v) : v))]
            : [...cu, !isNaN(Number(d)) ? Number(d) : d];
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
                  return Array.isArray(d)
                    ? [
                        ...cu,
                        ...d.map(v => (!isNaN(Number(v)) ? Number(v) : v))
                      ]
                    : [...cu, !isNaN(Number(d)) ? Number(d) : d];
                }, []);
            }
            fields = fields.filter(f => {
              let conval = _.get(
                ob,
                (f.match(/\[[0-9]+\]/) || []).reduce(
                  (cu, ind) => cu.replace("[]", ind),
                  config.conditionField
                )
              );
              return conditionValus.includes(
                !isNaN(Number(conval)) ? Number(conval) : conval
              );
            });
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
            return _.set(
              data,
              to,
              Array.isArray(resultObject)
                ? [...curvalue, ...resultObject]
                : [...curvalue, resultObject]
            );
          else if (typeof curvalue == "object")
            return _.set(
              data,
              to,
              Array.isArray(resultObject)
                ? { ...curvalue, resultObject }
                : { ...curvalue, ...resultObject }
            );
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
 * @param {string|[string]} config.from location of Array of objects
 * @param {string|[string]} config.to location of flatten array if empty it will be replaced
 * @param {string?} config.relative empty/not empty whether to is relative to from
 */
const flatten = function flatten(data, config) {
  try {
    let from = arrayParser(config.from).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let to = config.to
      ? arrayParser(config.to).reduce(
          (cu, c) => [...cu, ...getPositions(data, c)],
          []
        )
      : null;
    if (!config.relative) {
      if (to && config.to != config.from)
        to.forEach(p =>
          _.set(data, p, _.flattenDeep(from.map(p => _.get(data, p))))
        );
      else from.forEach(f => _.set(data, f, _.flattenDeep(_.get(data, f))));
    } else {
      from.forEach(f => {
        let findexes = f.match(/\[[0-9]+\]/g) || [];
        let fval = _.flattenDeep(_.get(data, f));
        arrayParser(config.to).forEach(t => {
          let to = findexes.reduce((cu, c) => cu.replace("[]", c), t);
          if (to.includes("[]")) to = to.replace(/\[\]/g, "[0]");
          let curval = _.get(data, to);
          _.set(data, to, Array.isArray(curval) ? [...curval, ...fval] : fval);
        });
      });
    }
    return;
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
 * @param {string} config.relativeLookup empty/not empty if the lookupFields are relative to from
 * @param {string} config.conditionField relative location of condition fields
 * @param {string|[string]} config.conditionValue relative location of condition value fields
 * @param {*?} config.conditionRelative relativity of location of condition value fields
 */
const lookup = function lookup(data, config) {
  try {
    let origin = arrayParser(config.from);
    let destination = arrayParser(config.to);
    //set to array if string of array

    //get all of the lookup values in one object
    let lookupFields = arrayParser(config.lookupFields);
    let lookupValues;
    if (!config.relativeLookup) {
      lookupValues = lookupFields
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let val = _.get(data, c);
          if (Array.isArray(val)) {
            return val.reduce((cus, cc) => ({ ...cus, [cc]: c }), cu);
          } else return { ...cu, [_.get(data, c)]: c };
        }, {});
    }

    let conditionValus;
    let condvalupaths = arrayParser(config.conditionValue);
    if (config.conditionField && !config.conditionRelative) {
      conditionValus = condvalupaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d)
            ? [...cu, ...d.map(v => (!isNaN(Number(v)) ? Number(v) : v))]
            : [...cu, !isNaN(Number(d)) ? Number(d) : d];
        }, []);
    }
    // loop through from and to
    for (let i = 0; i < origin.length; i++) {
      let org = origin[i];
      let des = destination[i];
      let positions = getPositions(data, org);
      if (!positions.length) throw new Error("no data in position");
      positions.forEach(p => {
        let indexarray = p.match(/\[[0-9]+\]/g) || [];
        if (config.conditionField) {
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
                return Array.isArray(d)
                  ? [...cu, ...d.map(v => (!isNaN(Number(v)) ? Number(v) : v))]
                  : [...cu, !isNaN(Number(d)) ? Number(d) : d];
              }, []);
          }

          let conval = _.get(
            data,
            indexarray.reduce(
              (cu, c) => cu.replace("[]", c),
              config.conditionField
            )
          );
          if (
            !conditionValus.includes(
              !isNaN(Number(conval)) ? Number(conval) : conval
            )
          )
            return;
        }
        if (config.relativeLookup) {
          lookupValues = lookupFields
            .map(lp => indexarray.reduce((cu, c) => cu.replace("[]", c), lp))
            .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
            .reduce((cu, c) => {
              let val = _.get(data, c);
              if (Array.isArray(val)) {
                return val.reduce((cus, cc) => ({ ...cus, [cc]: c }), cu);
              } else return { ...cu, [_.get(data, c)]: c };
            }, {});
        }
        let lookupValue = _.get(data, p);
        let resultpath = lookupValues[lookupValue] || null;
        let resultvalue = "";
        if (resultpath) {
          let returningFields = (resultpath.match(/\[[0-9]+\]/g) || []).reduce(
            (cu, c) => cu.replace("[]", c),
            config.returningFields
          );
          if (returningFields.includes("[]"))
            resultvalue = getPositions(data, returningFields).reduce(
              (cu, p) => {
                return [...cu, _.get(data, p)];
              },
              []
            );
          else resultvalue = _.get(data, returningFields) || null;
        }

        let to = indexarray.reduce((cu, c) => cu.replace("[]", c), des);
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
 * @param {string} config.from  location of arrays to be sorted
 * @param {string} config.to (optional) location of output array
 * @param {string} config.sortBy location of sortingby field
 * @param {string|[string]} config.sortArray locations of arrays of sorted values
 * @param {string} config.sortArrayRelativity if the sortArray location is relative to from field
 */
const sortBy = function sortBy(data, config) {
  try {
    let origin = getPositions(data, config.from);
    if (!origin.length) return false;
    let sortarray;
    if (config.sortArray && !config.sortArrayRelativity) {
      sortarray = arrayParser(config.sortArray)
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let val = _.get(data, c);
          return Array.isArray(val) ? [...cu, ...val] : [...cu, val];
        }, []);
    }

    origin.forEach(p => {
      let targetarray = _.cloneDeep(_.get(data, p));
      let pindexes = p.match(/\[[0-9]+\]/g) || [];
      if (config.sortArray && config.sortArrayRelativity) {
        sortarray = arrayParser(config.sortArray)
          .map(sa => pindexes.reduce((cu, c) => cu.replace("[]", c), sa))
          .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
          .reduce((cu, c) => {
            let val = _.get(data, c);
            return Array.isArray(val) ? [...cu, ...val] : [...cu, val];
          }, []);
      }
      targetarray.sort((a, b) => {
        let aval = _.get(a, sortBy);
        let bval = _.get(b, sortBy);
        return sortarray
          ? sortarray.indexOf(aval) > sortarray.indexOf(bval)
            ? 1
            : -1
          : aval > bval
          ? 1
          : -1;
      });
      _.set(
        data,
        pindexes.reduce(
          (cu, c) => cu.replace("[]", c),
          config.to || config.from
        ),
        targetarray
      );
    });
  } catch (e) {
    console.error(e);
    return e;
  }
};

/**
 * @param {object} data data to be manuplated
 * @param {object} config procedure configuration
 * @param {string|[string]} config.positives location of positive inputs
 * @param {string|[string]} config.negetives location of negetive inputs
 * @param {string|[string]} config.to location of output fields
 * @param {string|[string]} config.conditionFields location of condition fields
 * @param {string|[string]} config.conditionValues location of condition values
 * @param {string} config.conditionRelative empty/notempty if the conditionValues is relative to from fields
 */
const sum = function sum(data, config) {
  try {
    let positives = arrayParser(config.positives).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let negetives = arrayParser(config.negetives).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let conditionFields = arrayParser(config.conditionFields);
    let to = arrayParser(config.to);
    let conditionValues;
    let conditionValuepaths = arrayParser(config.conditionValues);
    if (config.conditionFields && !config.conditionRelative) {
      conditionValues = conditionValuepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let val = _.get(data, c);
          if (Array.isArray(val)) return [...cu, ..._.flattenDeep(val)];
          return [...cu, val];
        }, []);
    }

    positives.forEach(p => {
      let val = _.get(data, p);
      if (Array.isArray(val))
        val = _.flattenDeep(val).reduce((cu, c) => {
          val = parseFloat(c);
          return val ? cu + val : cu;
        }, 0);
      if (!val) return;
      let pIndexes = p.match(/\[[0-9]+\]/g) || [];
      if (config.conditionFields) {
        if (config.conditionRelative) {
          conditionValues = conditionValuepaths.reduce(
            (cu, c) => [
              ...cu,
              ...getPositions(
                data,
                pIndexes.reduce((cu1, c1) => cu1.replace("[]", c1), c)
              ).reduce((cu1, c1) => {
                let val = _.get(data, c1);
                if (Array.isArray(val)) return [...cu1, ..._.flattenDeep(val)];
                return [...cu1, val];
              }, cu)
            ],
            []
          );
        }
        if (
          !conditionFields.some(cf =>
            conditionValues.includes(
              _.get(pIndexes.reduce((cu, c) => cu.replace("[]", c1), cf))
            )
          )
        )
          return;
      }
      to.forEach(t => {
        let top = pIndexes.reduce((cu, c) => cu.replace("[]", c), t);
        let tov = parseFloat(_.get(data, top)) || 0;
        tov += val;
        _.set(data, top, tov);
      });
    });

    negetives.forEach(n => {
      let val = parseFloat(_.get(data, n));
      if (Array.isArray(val))
        val = _.flattenDeep(val).reduce((cu, c) => {
          val = parseFloat(c);
          return val ? cu + val : cu;
        }, 0);
      if (!val) return;
      let pIndexes = n.match(/\[[0-9]+\]/g) || [];
      if (config.conditionFields) {
        if (config.conditionRelative) {
          conditionValues = conditionValuepaths.reduce(
            (cu, c) => [
              ...cu,
              ...getPositions(
                data,
                pIndexes.reduce((cu1, c1) => cu1.replace("[]", c1), c)
              ).reduce((cu1, c1) => {
                let val = _.get(data, c1);
                if (Array.isArray(val)) return [...cu1, ..._.flattenDeep(val)];
                return [...cu1, val];
              }, cu)
            ],
            []
          );
        }
        if (
          !conditionFields.some(cf =>
            conditionValues.includes(
              _.get(pIndexes.reduce((cu, c) => cu.replace("[]", c1), cf))
            )
          )
        )
          return;
      }
      to.forEach(t => {
        let top = pIndexes.reduce((cu, c) => cu.replace("[]", c), t);
        let tov = parseFloat(_.get(data, top)) || 0;
        tov -= val;
        _.set(data, top, tov);
      });
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
 * @param {string|[string]} config.multiplier location of multiplier inputs
 * @param {string|[string]} config.divider location of divider inputs
 * @param {string|[string]} config.to location of output fields
 * @param {string|[string]} config.conditionFields location of condition fields
 * @param {string|[string]} config.conditionValues location of condition values
 * @param {string} config.conditionRelative empty/notempty if the conditionValues is relative to from fields
 */
const multiply = function multiply(data, config) {
  try {
    let positives = arrayParser(config.multiplier).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let negetives = arrayParser(config.divider).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let conditionFields = arrayParser(config.conditionFields);
    let to = arrayParser(config.to);
    let conditionValues;
    let conditionValuepaths = arrayParser(config.conditionValues);
    if (config.conditionFields && !config.conditionRelative) {
      conditionValues = conditionValuepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let val = _.get(data, c);
          if (Array.isArray(val)) return [...cu, ..._.flattenDeep(val)];
          return [...cu, val];
        }, []);
    }

    positives.forEach(p => {
      let val = _.get(data, p);
      if (Array.isArray(val))
        val = _.flattenDeep(val).reduce((cu, c) => {
          val = parseFloat(c) || 1;
          return val ? cu * val : cu;
        }, 1);
      if (!val) return;
      let pIndexes = p.match(/\[[0-9]+\]/g) || [];
      if (config.conditionFields) {
        if (config.conditionRelative) {
          conditionValues = conditionValuepaths.reduce(
            (cu, c) => [
              ...cu,
              ...getPositions(
                data,
                pIndexes.reduce((cu1, c1) => cu1.replace("[]", c1), c)
              ).reduce((cu1, c1) => {
                let val = _.get(data, c1);
                if (Array.isArray(val)) return [...cu1, ..._.flattenDeep(val)];
                return [...cu1, val];
              }, cu)
            ],
            []
          );
        }
        if (
          !conditionFields.some(cf =>
            conditionValues.includes(
              _.get(pIndexes.reduce((cu, c) => cu.replace("[]", c1), cf))
            )
          )
        )
          return;
      }
      to.forEach(t => {
        let top = pIndexes.reduce((cu, c) => cu.replace("[]", c), t);
        let tov = parseFloat(_.get(data, top)) || 1;
        tov *= val;
        _.set(data, top, tov);
      });
    });

    negetives.forEach(n => {
      let val = parseFloat(_.get(data, n));
      if (Array.isArray(val))
        val = _.flattenDeep(val).reduce((cu, c) => {
          val = parseFloat(c) || 1;
          return val ? cu * val : cu;
        }, 1);
      if (!val) return;
      let pIndexes = n.match(/\[[0-9]+\]/g) || [];
      if (config.conditionFields) {
        if (config.conditionRelative) {
          conditionValues = conditionValuepaths.reduce(
            (cu, c) => [
              ...cu,
              ...getPositions(
                data,
                pIndexes.reduce((cu1, c1) => cu1.replace("[]", c1), c)
              ).reduce((cu1, c1) => {
                let val = _.get(data, c1);
                if (Array.isArray(val)) return [...cu1, ..._.flattenDeep(val)];
                return [...cu1, val];
              }, cu)
            ],
            []
          );
        }
        if (
          !conditionFields.some(cf =>
            conditionValues.includes(
              _.get(pIndexes.reduce((cu, c) => cu.replace("[]", c1), cf))
            )
          )
        )
          return;
      }
      to.forEach(t => {
        let top = pIndexes.reduce((cu, c) => cu.replace("[]", c), t);
        let tov = parseFloat(_.get(data, top)) || 1;
        tov /= val;
        _.set(data, top, Math.round(tov * 100) / 100);
      });
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
 * @param {string|[string]} config.from location of items
 * @param {string|[string]} config.to location of output arrays
 * @param {string|[string]} config.flatten whether to flatten the result array
 * @param {string|[string]} config.conditionFields location of condition fields
 * @param {string|[string]} config.conditionValues location of condition values
 * @param {string} config.conditionRelative empty/notempty if the conditionValues is relative to from fields
 */
const toArray = function toArray(data, config) {
  try {
    let from = arrayParser(config.from).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let to = arrayParser(config.to);
    let conditionFields = arrayParser(config.conditionFields);
    let conditionValues;
    let conditionValuepaths = arrayParser(config.conditionValues);
    if (config.conditionFields && !config.conditionRelative) {
      conditionValues = conditionValuepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let val = _.get(data, c);
          if (Array.isArray(val)) return [...cu, ..._.flattenDeep(val)];
          return [...cu, val];
        }, []);
    }

    from.forEach(p => {
      let val = _.get(data, p);
      if (config.flatten && Array.isArray(val)) val = _.flattenDeep(val);
      if (!val) return;
      let pIndexes = p.match(/\[[0-9]+\]/g) || [];
      if (config.conditionFields) {
        if (config.conditionRelative) {
          conditionValues = conditionValuepaths.reduce(
            (cu, c) => [
              ...cu,
              ...getPositions(
                data,
                pIndexes.reduce((cu1, c1) => cu1.replace("[]", c1), c)
              ).reduce((cu1, c1) => {
                let val = _.get(data, c1);
                if (Array.isArray(val)) return [...cu1, ..._.flattenDeep(val)];
                return [...cu1, val];
              }, cu)
            ],
            []
          );
        }
        if (
          !conditionFields.some(cf =>
            conditionValues.includes(
              _.get(pIndexes.reduce((cu, c) => cu.replace("[]", c1), cf))
            )
          )
        )
          return;
      }
      to.forEach(t => {
        let top = pIndexes.reduce((cu, c) => cu.replace("[]", c), t);
        let tov = _.get(data, top);
        if (!tov) {
          _.set(data, top, [val]);
          return;
        }
        if (!Array.isArray(tov)) {
          _.set(data, top, [tov, val]);
          return;
        }
        if (Array.isArray(val)) {
          let l = tov.length;
          val.forEach(v => (tov[l++] = v));
          return;
        }
        tov.push(val);
      });
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
 * @param {string|[string]} config.from location of items
 * @param {string|[string]} config.to location of output arrays
 * @param {string|[string]} config.locale conversion of date
 * @param {string|[string]} config.format whether to flatten the result array
 * @param {string|[string]} config.conditionFields location of condition fields
 * @param {string|[string]} config.conditionValues location of condition values
 * @param {string} config.conditionRelative empty/notempty if the conditionValues is relative to from fields
 */
const dateFormat = function dateFormat(data, config) {
  try {
    let from = arrayParser(config.from).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let tos = arrayParser(config.to);
    let conditionValues;
    let conditionValuepaths = arrayParser(config.conditionValues);
    if (config.conditionFields && !config.conditionRelative) {
      conditionValues = conditionValuepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let val = _.get(data, c);
          if (Array.isArray(val)) return [...cu, ..._.flattenDeep(val)];
          return [...cu, val];
        }, []);
    }
    from.forEach((p, i) => {
      let val = _.get(data, p);

      if (config.flatten && Array.isArray(val)) val = _.flattenDeep(val);
      if (!val) return;
      let pIndexes = p.match(/\[[0-9]+\]/g) || [];
      if (config.conditionFields) {
        if (config.conditionRelative) {
          conditionValues = conditionValuepaths.reduce(
            (cu, c) => [
              ...cu,
              ...getPositions(
                data,
                pIndexes.reduce((cu1, c1) => cu1.replace("[]", c1), c)
              ).reduce((cu1, c1) => {
                let val = _.get(data, c1);
                if (Array.isArray(val)) return [...cu1, ..._.flattenDeep(val)];
                return [...cu1, val];
              }, cu)
            ],
            []
          );
        }
        if (
          !conditionFields.some(cf =>
            conditionValues.includes(
              _.get(pIndexes.reduce((cu, c) => cu.replace("[]", c1), cf))
            )
          )
        )
          return;
      }
      let to = tos[i];
      let top = pIndexes.reduce((cu, c) => cu.replace("[]", c), to);
      if (top.includes("[]")) top = top.replace(/\[\]/g, "[0]");
      _.set(
        data,
        top,
        new persianDate([1396, 6, 17])
          .toLocale(config.locale == "fa" ? "fa" : "en")
          .format(config.format)
      );
    });
    return false;
  } catch (e) {
    console.error(e);
    return e;
  }
};

module.exports = {
  groupBy,
  sortBy,
  lookup,
  sum,
  multiply,
  toArray,
  flatten,
  dateFormat
};
