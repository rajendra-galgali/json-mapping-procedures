const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.parent location to insert new field( array or object )
 * @param {string?} config.name name of the field if parent is object
 * @param {*?} config.data data of the new field
 */
const fieldAdd = function fieldAdd(data, config) {
  try {
    if (!config.parent) throw new Error("parent can't be empty");
    let fieldlist = getPositions(data, config.parent);
    if (!fieldlist.length) throw new Error("Parent path is incorrect");
    let targetdata = config.data === undefined ? {} : config.data;
    try {
      targetdata = JSON.parse(targetdata);
    } catch (e) {}
    fieldlist.forEach(p => {
      let parent = _.get(data, p);
      if (typeof parent != "object")
        throw new Error("Parent must be object or array @ ", p);
      if (Array.isArray(parent)) parent.push(targetdata);
      else if (parent) parent[config.name || "undefined"] = targetdata;
      else if (p.indexOf(".") == -1) data[p] = targetdata;
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
 * @param {string} config.from location of origin data
 * @param {string} config.to location of target data
 */
const fieldCopy = function fieldCopy(data, config) {
  try {
    if (!config.from || !config.to)
      throw new Error("config.from and config.to can't be empty");
    let from = getPositions(data, config.from);
    let to = getPositions(data, config.to);
    if (!from.length || !to.length)
      throw new Error("Error in config.from or config.to path");
    let resultdata =
      from.length == 1
        ? _.cloneDeep(_.get(data, config.from))
        : from.map(p => _.cloneDeep(_.get(data, p)));
    to.forEach(tar => _.set(data, tar, resultdata));
  } catch (e) {
    console.error(e);
    return e;
  }
  return false;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.path location of field to remove
 */
const fieldRemove = async function fieldRemove(data, config) {
  try {
    let fields = getPositions(data, config.path);
    if (!fields.length) throw new Error("no such path exists");
    let tdata = _.omit(data, fields);
    Object.keys(data).forEach(k => {
      if (!tdata[k]) return delete data[k];
      data[k] = tdata[k];
    });
    // fields.forEach(f => {
    //   _.omit(data, f);
    // });
  } catch (e) {
    console.error(e);
    return e;
  }
  return;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.path location of fields to rename
 * @param {string} config.name new name of fields
 */
const fieldRename = function fieldRename(data, config) {
  try {
    if(path.match(/\./).length) throw new Error("can't rename Root Data Field!!!")
    let fields = getPositions(data, config.path);
    if (!fields.length) throw new Error("no such path exists");
    fields.forEach(f => {
      let newPath = f.slice(0, f.lastIndexOf(".") + 1) + config.name;
      _.set(data, newPath, _.cloneDeep(_.get(data, f)));
      _.omit(data, f);
      let tdata = _.omit(data, f);
      Object.keys(data).forEach(k => {
        if (!tdata[k]) return delete data[k];
        data[k] = tdata[k];
      });
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
 * @param {string} config.path location of fields to change content
 * @param {string} config.data new data to set
 */
const fieldSetContent = function fieldSetContent(data, config) {
  try {
    let fields = getPositions(data, config.path);
    if (!fields.length) throw new Error("no such path exists");
    let contentdata;
    try {
      contentdata = JSON.parse(config.data);
    } catch (e) {}
    fields.forEach(f => {
      _.set(data, f, _.cloneDeep(contentdata));
    });
  } catch (e) {
    console.error(e);
    return e;
  }
  return;
};


module.exports = {
  fieldAdd,
  fieldCopy,
  fieldRemove,
  fieldRename,
  fieldSetContent
};
