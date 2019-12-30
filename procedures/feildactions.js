const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");
const { parser, arrayParser } = require("../helpers");

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string | [string]} config.parent location to insert new field( array or object )
 * @param {string?} config.name name of the field if parent is object
 * @param {*?} config.data data of the new field
 * @param {string?} config.conditionField data of the new field
 * @param {string? | [string]?} config.conditionValue data of the new field
 * @param {*?} config.conditionRelative Relativity of condition value
 */
const fieldAdd = function fieldAdd(data, config) {
  try {
    let fieldlist;
    let targetdata = config.data === undefined ? {} : parser(config.data);
    if (!config.parent) {
      _.set(data, config.name || "undefined", targetdata);
      return;
    }

    fieldlist = arrayParser(config.parent).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    if (!fieldlist.length) throw new Error("Parent path is incorrect");
    // if (!fieldlist.length)
    //   _.set(data,parent + "." + config.name || "undefined", targetdata);
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

    fieldlist.forEach(p => {
      let parent = _.get(data, p);
      if (typeof parent != "object")
        throw new Error("Parent must be object or array @ ", p);
      let fulladdress = p + "." + config.name;
      if (config.conditionField) {
        let fulladdresindexarray = fulladdress.match(/\[[0-9]+\]/g) || [];
        if (config.conditionRelative) {
          conditionValus = condvalupaths
            .reduce(
              (cu, c) => [
                ...cu,
                fulladdresindexarray.reduce(
                  (cu, cin) => cu.replace("[]", cin),
                  c
                )
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
          fulladdresindexarray.reduce(
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
      if (Array.isArray(parent)) parent.push(_.cloneDeep(targetdata));
      else
        _.set(
          data,
          p + "." + config.name || "undefined",
          _.cloneDeep(targetdata)
        );
      // else if (p.indexOf(".") == -1) data[p] = targetdata;
    });
  } catch (e) {
    console.error(e);
    return e;
  }
  return false;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string|[string]} config.from location of origin data
 * @param {string|[string]} config.to location of target data
 * @param {string} config.relative relativity of copy action
 * @param {string} config.conditionField location of condition fields
 * @param {string} config.conditionValue location of condition acceptable values
 * @param {string} config.conditionRelative if the condition values are relative or not
 */
const fieldCopy = function fieldCopy(data, config) {
  try {
    let from = arrayParser(config.from).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let to = config.to;
    if (!config.relative) {
      to = arrayParser(config.to).reduce(
        (cu, c) => [...cu, ...getPositions(data, c)],
        []
      );
    }
    let conditionValues;
    let condvaluepaths = arrayParser(config.conditionValue);
    if (config.conditionField && !config.conditionRelative) {
      conditionValues = condvaluepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d)
            ? [...cu, ...d.map(v => (!isNaN(Number(v)) ? Number(v) : v))]
            : [...cu, !isNaN(Number(d)) ? Number(d) : d];
        }, []);
    }
    from.forEach(fp => {
      let fromvalue = _.cloneDeep(_.get(data, fp));
      if (config.conditionField) {
        let indexarray = fp.match(/\[[0-9]+\]/g) || [];

        if (config.conditionRelative) {
          conditionValues = condvaluepaths
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
          !conditionValues.includes(
            !isNaN(Number(conval)) ? Number(conval) : conval
          )
        )
          return;
      }
      if (!config.relative) {
        to.forEach(tp => {
          let curentvalue = _.get(data, tp);
          if (Array.isArray(curentvalue)) {
            _.set(
              data,
              tp,
              Array.isArray(fromvalue)
                ? [...curentvalue, ...fromvalue]
                : [...curentvalue, fromvalue]
            );
            return;
          }
          _.set(data, tp, fromvalue);
        });
        return;
      }
      to = (fp.match(/\[[0-9]+\]/g) || []).reduce(
        (rp, ind) => rp.replace("[]", ind),
        config.to
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
      }
      let curentvalue = _.get(data, to);
      if (Array.isArray(curentvalue)) {
        let l = curentvalue.length;
        if (Array.isArray(fromvalue)) {
          fromvalue.forEach(v => (curentvalue[l++] = _.cloneDeep(v)));
        } else {
          curentvalue[l] = fromvalue;
        }
        return;
      }
      _.set(data, to, fromvalue);
    });
  } catch (e) {
    console.error(e);
    return e;
  }
  return false;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string|[string]} config.path location of field to remove
 * @param {string} config.conditionField location of condition fields
 * @param {string} config.conditionValue location of condition acceptable values
 * @param {string} config.conditionRelative if the condition values are relative or not
 */
const fieldRemove = async function fieldRemove(data, config) {
  try {
    let fields = arrayParser(config.path).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    if (!fields.length) throw new Error("no such path exists");
    let condvaluepaths = arrayParser(config.conditionValue);
    let conditionValues;
    if (config.conditionField && !config.conditionRelative) {
      conditionValues = condvaluepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d)
            ? [...cu, ...d.map(v => (!isNaN(Number(v)) ? Number(v) : v))]
            : [...cu, !isNaN(Number(d)) ? Number(d) : d];
        }, []);
    }
    fields.forEach(f => {
      if (config.conditionField) {
        let indexarray = f.match(/\[[0-9]+\]/g) || [];
        if (config.conditionRelative) {
          conditionValues = condvaluepaths
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
          !conditionValues.includes(
            !isNaN(Number(conval)) ? Number(conval) : conval
          )
        )
          return;
      }
      removeItem(data, f);
    });
  } catch (e) {
    console.error(e);
    return e;
  }
  return false;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string | [string]} config.path location of fields to rename
 * @param {string} config.name new name of fields
 * @param {string} config.conditionField location of condition fields
 * @param {string|[string]} config.conditionValue location of condition acceptable values
 * @param {string} config.conditionRelative if the condition values are relative or not
 */
const fieldRename = function fieldRename(data, config) {
  try {
    let fields = arrayParser(config.path).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    if (!fields.length) return "no such path exists";
    let condvaluepaths = arrayParser(config.conditionValue);
    if (config.conditionField && !config.conditionRelative) {
      conditionValues = condvaluepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d)
            ? [...cu, ...d.map(v => (!isNaN(Number(v)) ? Number(v) : v))]
            : [...cu, !isNaN(Number(d)) ? Number(d) : d];
        }, []);
    }
    fields.forEach(f => {
      if (config.conditionField) {
        let indexarray = f.match(/\[[0-9]+\]/g) || [];
        if (config.conditionRelative) {
          conditionValues = condvaluepaths
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
      let newPath = f.slice(0, f.lastIndexOf(".") + 1) + config.name;
      _.set(data, newPath, _.cloneDeep(_.get(data, f)));
      removeItem(data, f);
    });
  } catch (e) {
    console.error(e);
    return e;
  }
  return;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string | [string]} config.path location of fields to change content
 * @param {string} config.data new data to set
 * @param {string} config.conditionField location of condition fields
 * @param {string|[string]} config.conditionValue location of condition acceptable values
 * @param {string} config.conditionRelative if the condition values are relative or not
 */
const fieldSetContent = function fieldSetContent(data, config) {
  try {
    let fields = arrayParser(config.path).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    if (!fields.length) throw new Error("no such path exists");
    let contentdata = parser(config.data);

    let condvaluepaths = arrayParser(config.conditionValue);
    if (config.conditionField && !config.conditionRelative) {
      conditionValues = condvaluepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d)
            ? [...cu, ...d.map(v => (!isNaN(Number(v)) ? Number(v) : v))]
            : [...cu, !isNaN(Number(d)) ? Number(d) : d];
        }, []);
    }

    fields.forEach(f => {
      if (config.conditionField) {
        let indexarray = f.match(/\[[0-9]+\]/g) || [];
        if (config.conditionRelative) {
          conditionValues = condvaluepaths
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
        if (!conditionValus.includes()) return;
      }
      _.set(data, f, contentdata);
    });
  } catch (e) {
    console.error(e);
    return e;
  }
  return;
};

const removeItem = function removeItem(data, path) {
  if (path.slice(-1) == "]") {
    let itemindex = parseFloat(path.match(/\[([0-9]+)\]$/)[1]);
    if (isNaN(itemindex)) return;
    _.get(data, path.replace(/\[([0-9]+)\]$/, "")).splice(itemindex, 1);
  } else {
    if (path.includes(".")) {
      delete _.get(data, path.slice(0, path.lastIndexOf(".")))[
        path.slice(path.lastIndexOf(".") + 1)
      ];
    } else {
      delete data[path];
    }
  }
};

module.exports = {
  fieldAdd,
  fieldCopy,
  fieldRemove,
  fieldRename,
  fieldSetContent
};
