module.exports = {
  fieldAdd: {
    parent: "",
    name: "undefined",
    data: "{}",
    descriptions: {
      overall: "Adds a feild based of path and data given",
      parent: "string : Parent Feild to add key",
      name:
        "string  : The key of adding item if the parent is an array it will be ommited",
      data:
        "* : Data to be inserted as item value if it's json-string it will be parsed "
    }
  },
  fieldCopy: {
    from: "",
    to: "",
    fromConditionFeild: "",
    fromConditionValuePath: "",
    descriptions: {
      overall: "Copy items value from one path to multiple paths",
      from: "string : The path of origin",
      to: "string > The path of destination",
      fromConditionFeild:
        "string > The path of feild to check the fromConditionValue with",
      fromConditionValuePath:
        "string > The path of value to check the fromConditionFeild value with"
    }
  },
  fieldRemove: {
    path: "",
    descriptions: {
      overall: "Removes multiple feilds based on given paths",
      path: "string | [string] > Paths of items to be removed"
    }
  },
  fieldRename: {
    path: "",
    name: "",
    descriptions: {
      overall: "Change the key at given paths",
      path: "string | [string] : Paths of items to be renamed",
      name: "string : New key name"
    }
  },
  fieldSetContent: {
    path: "",
    data: "{}",
    descriptions: {
      overall: "Setting values in pathes",
      path: "string | [string] : The pathes to be changed",
      data: "* : Data to be set in path"
    }
  },
  // groupToSibling:{
  //   from: "",
  //   fromFeild: "",
  //   operation: "+",
  //   conditionPath: "",
  //   conditionValue: "",
  //   conditionRule: "eq",
  //   targetPath: "",
  //   targetObject: "",
  //   descriptions:{
  //     overall:"",
  //   }
  // },
  // groupBy:{
  //   from:"",
  //   groupBy:"",
  //   feilds:"",
  //   to:"",
  //   descriptions:{
  //     overall:"",
  //   }
  // },
  groupBySum: {
    from: "",
    groupBy: "",
    field: "",
    to: "",
    toResultField: "",
    toGroupByField: "",
    descriptions: {
      overall: "Sums up the feilds value of an array",
      from: "string : The path of arrays to be groupedBy (Parent array)",
      groupBy: "string : The relative path of feild to group data by",
      field: "string : The relative path of feild to sum ",
      to: "string : The path of output result",
      toResultField: "string? : The result json sumed value field",
      toGroupByField: "string? : The result json 'value of groupedBy' field"
    }
  },
  flatten: {
    from: "",
    to: "",
    descriptions: {
      overall: "Flatten arrays in one level",
      from: "string | [string] : paths of Arrays to Flatten",
      to: "string : Path of target Array"
    }
  },
  groupByFeild: {
    from: "",
    groupBy: "",
    field: "",
    to: "",
    groupByKey: "",
    descriptions: {
      overall: ""
    }
  },
  CustomFunction: {
    script: "",
    descriptions: {
      overall:
        "Runns Custom script in javaScript it has access to all datas and lodash functionalities",
      script: "string : js script to be runned"
    }
  },
  lookup: {
    from: "",
    to: "",
    lookupFields: "",
    returningFields: "",
    descriptions: {
      overall:
        "Lookups value form feilds and search for math then returns result",
      from: "string | [string] : Absolute paths of values to be looked up",
      to: "string | [string] : Absolute paths of returning value",
      lookupFields: "string | [string] : feilds that contain looking up values",
      returningFields: "string : returning path after lookup is done"
    }
  }
};
