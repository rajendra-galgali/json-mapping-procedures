const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");

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
    if(config.to.match("[]") != config.from.match("[]")) throw new Error("to field should have same number of array as from field");
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
    finalresult.forEach(fo=>{
      let rov = fo.resultObject;
      let ro = fo.arrayaddress;
      let to = config.to;
      let arnum = ro.match(/\[[0-9]+\]/g);
      arnum.forEach(ind=>{
        to = to.replace("[]",ind);
      });
      _.set(data,to,rov)
      
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
    config.to = config.to || config.from.slice(0,config.from.lastIndexOf(".")+1)+"__groupby"+ config.groupBy;
    if(config.to.match("[]") > config.from.match("[]")) throw new Error("to field can't have more number of array as from field");
    let positions = getPositions(data, config.from);
    if (!positions.length) throw new Error("no array in position");
    positions.forEach((p,ri )=> {
      let arrayobject = _.get(data, p);
      let resultObject = {};
      arrayobject.forEach(ob => {
        
        getPositions(ob,config.groupBy).forEach(gb=>{
          let gbval = (_.get(ob, gb)||"undefined").toString();
          resultObject[gbval] = resultObject[gbval] ||0;
          let fieldsParent = gb.slice(0, gb.lastIndexOf(".") + 1);
          getPositions(ob, fieldsParent + config.field)
          .forEach(f => {
            return resultObject[gbval] +=  parseFloat(_.get(ob, f))}
          );
        })
      });
      if(config.toGroupByField || config.toResultField){
        let toGroupByField = config.toGroupByField || config.field.slice(config.field.lastIndexOf('.'));
        let toResultField = config.toResultField || config.groupBy.slice(config.groupBy.lastIndexOf('.'));

        resultObject = Object.keys(resultObject).reduce((cu,c)=>{
          return [...cu,{[toGroupByField]:c,[toResultField]:resultObject[c] }]; 
        },[]);
      }
      let to = config.to;
      let arnum = p.match(/\[[0-9]+\]/g);
      let index = 0;
      if(arnum){
        arnum.forEach(ind=>{
          let fto = to.replace("[]",ind);
          if(to == fto) {
            to = to+"["+index+"]";
            index++;
          }else{
            to = fto;
          }
        });

      }
      let curvalue = _.get(data,to);
      if(curvalue){
        if(Array.isArray(curvalue)){
          resultObject = [...curvalue,...resultObject];
        }else if(typeof curvalue == 'object'){
          resultObject = {...curvalue,...resultObject};
        }
      }
        _.set(data,to,resultObject)
      
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
    if(config.to.match("[]") != config.from.match("[]")) throw new Error("to field should have same number of array as from field");
    let positions = getPositions(data, config.from);
    if (!positions.length) throw new Error("no array in position");
    positions.forEach(p => {
      let arrayobject = _.get(data, p);
      let resultObject = {};
      arrayobject.forEach(ob => {
        let gb = config.groupBy;
        let gbval = config.groupByKey ? gb.slice(0, gb.lastIndexOf(".")) : _.get(ob, gb).toString();
        resultObject[gbval] = resultObject[gbval] ||[];
        getPositions(ob, config.field)
        .forEach(f => {
          return resultObject[gbval].push(_.get(ob, f))}
        );
      });
      let to = config.to;
      let arnum = p.match(/\[[0-9]+\]/g);
      if(arnum)
        arnum.forEach(ind=>{
          to = to.replace("[]",ind);
        });

      
      _.set(data,to,resultObject)
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
  try{
    let from, to;
  try {
    from = JSON.parse(config.from);
  } catch (e) {
    from = [config.from];
  }
  try {
    to = JSON.parse(config.to);
  } catch (e) {
    to = [config.to];
  }
    let result = from.reduce((cu,c)=>([...cu,...getPositions(data,c)]),[]).map(p=>_.get(data,p));
    to.reduce((cu,c)=>([...cu,...getPositions(data,c)]),[]).forEach(p=> _.set(data,p,_.flattenDeep(result)));
  }catch(e){
    console.error(e);
    return e;
  }
};


/**
 * @param {object} data data to be manuplated
 * @param {object} config procedure configuration
 * @param {string} config.from location of input
 * @param {string} config.to location of output
 * @param {string} config.lookupFields location of lookingup fields
 * @param {string} config.returningFields location of returning Fields
 */
const lookup = function lookup(data, config) {
  try{
    if(config.to.match("[]") != config.from.match("[]")) throw new Error("to field should have same number of array as from field");
    // if(config.lookupFields.match("[]") != config.returningFields.match("[]")) throw new Error("lookupFields field should have same number of array as returningFields field");
    let positions = getPositions(data, config.from);
    let lookupValues = getPositions(data,config.lookupFields).reduce((cu,c)=>({...cu,[_.get(data,c)]:c}),{});
    
    if (!positions.length) throw new Error("no data in position");

    positions.forEach(p => {
      let lookupValue = _.get(data, p);
      let resultpath = lookupValues[lookupValue] || null;
      let to = config.to;
      let returningFields = config.returningFields;


      let arrnum = p.match(/\[[0-9]+\]/g);
      if(arrnum)
        arrnum.forEach(ind=>{
          to = to.replace("[]",ind);
        });
      let arnum = resultpath.match(/\[[0-9]+\]/g);
      if(arnum)
        arnum.forEach(ind=>{
          returningFields = returningFields.replace("[]",ind);
        });
       _.set(data,to,_.get(data,returningFields)|| null)
    });
  }catch(e){
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
