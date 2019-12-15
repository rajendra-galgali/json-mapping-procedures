const config = require("./config");
const funcs = require('./procedures');
const exec = function exec(data,procedures,quiet=false){
  let logger = (...msg)=>!quiet? console.log(...msg):null;
  return new Promise(async(resolve,reject)=>{
    try{
      logger("--------- Procedural actions started ----------------");
        let startin = new Date();
      if(!Array.isArray) procedures = [procedures];
      for (let i = 0; i < procedures.length; i++) {
        let pstart = new Date();
        let p = procedures[i];
        let err = await funcs[p.type](data, p.config);
        logger(`  - Procedure ${p.name} done in ${new Date() - pstart} ms `);
        if (err) {
          logger(`--------- ERROR Occured @ ${p.name} -------------------`);
          logger(
            new Date() + "ERROR while enriching json for invoice number - ",
            invoice.invoiceSummary.invoiceNumber,
            " and error is ",
            err
          );
        }
      }
      logger(
        `--------- Procedural actions done in ${new Date() -
          startin} ms ----------------`
      );  
      return resolve(data);
    }catch(e){
      reject(e);
    }
  });
}
module.exports = {
  funcs,
  exec,
  config
};
