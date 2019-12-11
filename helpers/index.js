
const parser = function parser(variable){
  let result;
  try{
    result =JSON.parse(variable)
  }catch(e){
    result = variable;
  }
  return result;
}

const arrayParser = function arrayParser(variable){
  let result = parser(variable);
  return Array.isArray(result) ? result : [result];
}

module.exports = {
  parser,
  arrayParser
}