// main function to test locally
// ensure that input.json has a valid request body

var lambda  = require('./cloudtrail.js')
var event   = require('./input.json')

var context = {}
context.done = function(arg1, arg2) {
  console.log('context.done')
}
lambda.handler(event, context)
