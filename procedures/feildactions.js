const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.parent location to insert new feild( array or object )
 * @param {string?} config.name name of the feild if parent is object
 * @param {*?} config.data data of the new feild
 */
const feildAdd = function feildAdd(data, config) {
  try {
    if (!config.parent) throw new Error("parent can't be empty");
    let feildlist = getPositions(config.parent);
    if (!feildlist.length) throw new Error("Parent path is incorrect");
    feildlist.forEach(p => {
      let parent = _.get(data, p);
      let targetdata = config.data === undefined ? {} : config.data;
      if (typeof parent != "object")
        throw new Error("Parent must be object or array @ ", p);
      if (Array.isArray(parent)) parent.push(targetdata);
      else parent[config.name || "undefined"] = targetdata;
    });
  } catch (e) {
    return e;
  }
  return ;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.from location of origin data
 * @param {string} config.to location of target data
 */
const feildCopy = function feildCopy(data, config) {
  try {
    if (!config.from || !config.to)
      throw new Error("config.from and config.to can't be empty");
    let from = getPositions(config.from);
    let to = getPositions(config.to);
    if (!from.length || !to.length || to.length > 1)
      throw new Error("Error in config.from or config.to path");
    let resultdata =
      from.length == 1
        ? _.cloneDeep(_.get(data, config.from))
        : from.map(p => _.cloneDeep(_.get(data, p)));
    _.set(data, targetpath, resultdata);
  } catch (e) {
    return e;
  }
  return false;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.path location of feild to remove
 */
const feildRemove = function feildRemove(data, config) {
  try {
  let feilds = getPositions(config.path);
  if(!feilds.length) throw new Error('no such path exists');
  feilds.forEach(f=>{
    _.omit(data, f);
  })
  } catch (e) {
    return e;
  }
  return ;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.path location of feilds to rename
 * @param {string} config.name new name of feilds
 */
const feildRename = function feildRename(data, config) {
  try {
    let feilds = getPositions(config.path);
    if(!feilds.length) throw new Error('no such path exists');
    feilds.forEach(f=>{
      let newPath = f.slice(0,f.lastIndexOf('.')+1)
      _.set(data,newPath,_.cloneDeep(_.get(data,f)));
      _.omit(data,f);
    })
    } catch (e) {
      return e;
    }
    return ;
};

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {string} config.path location of feilds to change content
 * @param {string} config.data new data to set
 */
const feildSetContent = function feildSetContent(data, config) {
  try {
    let feilds = getPositions(config.path);
    if(!feilds.length) throw new Error('no such path exists');
    feilds.forEach(f=>{
      _.set(data,f,_.cloneDeep(config.data));
    })
    } catch (e) {
      return e;
    }
    return ;

};


module.exports = {
  feildAdd,
  feildCopy,
  feildRemove,
  feildRename,
  feildSetContent
};
