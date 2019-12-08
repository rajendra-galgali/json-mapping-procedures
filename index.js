const _ = require('lodash');
const  {getPositions}  = require('lodash-bzextras');

let a = { a: [
  {
    a:1,b:3
  },
  {
    a:1,b:3
  },
  {
    a:1,b:3
  },
  {
    a:1,b:3
  }

] };

console.log(getPositions(a,"a[].a"))