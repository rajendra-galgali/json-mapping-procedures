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
    if (!config.parent) throw new Error("parent can't be empty");
    let fieldlist = arrayParser(config.parent).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );

    if (!fieldlist.length) throw new Error("Parent path is incorrect");
    let targetdata = config.data === undefined ? {} : parser(config.data);
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
              return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
            }, []);
        }
        if (
          !conditionValus.includes(
            _.get(
              data,
              fulladdresindexarray.reduce(
                (cu, c) => cu.replace("[]", c),
                config.conditionField
              )
            )
          )
        )
          return;
      }
      if (Array.isArray(parent)) parent.push(targetdata);
      else if (parent) parent[config.name || "undefined"] = targetdata;
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
 * @param {string} config.to location of target data
 * @param {string} config.conditionField location of condition fields
 * @param {string} config.conditionValue location of condition acceptable values
 * @param {string} config.conditionRelative if the condition values are relative or not
 */
const fieldCopy = function fieldCopy(data, config) {
  try {
    if (!config.from || !config.to)
      throw new Error("config.from and config.to can't be empty");
    let from = arrayParser(config.from).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    let conditionValues;
    let condvaluepaths = arrayParser(config.conditionValue);
    if (config.conditionField && !config.conditionRelative) {
      conditionValues = condvaluepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
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
      let to = (fp.match(/\[[0-9]+\]/g) || []).reduce(
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
    if (config.conditionField && !config.conditionRelative) {
      conditionValues = condvaluepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
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
    if (path.match(/\./).length)
      throw new Error("can't rename Root Data Field!!!");
    let fields = arrayParser(config.path).reduce(
      (cu, c) => [...cu, ...getPositions(data, c)],
      []
    );
    if (!fields.length) throw new Error("no such path exists");
    let condvaluepaths = arrayParser(config.conditionValue);
    if (config.conditionField && !config.conditionRelative) {
      conditionValues = condvaluepaths
        .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
        .reduce((cu, c) => {
          let d = _.get(data, c);
          return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
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
          return Array.isArray(d) ? [...cu, ...d] : [...cu, d];
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
      _.set(data, f, _.cloneDeep(contentdata));
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
    delete _.get(data, path.slice(0, path.lastIndexOf(".")))[
      path.slice(path.lastIndexOf(".") + 1)
    ];
  }
};
module.exports = {
  fieldAdd,
  fieldCopy,
  fieldRemove,
  fieldRename,
  fieldSetContent
};
