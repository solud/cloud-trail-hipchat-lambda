var FILTER_CONFIG = {
  "apiAuthToken" : '',
// "source" : "iam|signin|sts|ec2|vpc|s3",
   "source" : ".",
   "regexp" : '^(?!Describe|List|Get)([a-zA-Z]+)$',
   "roomId" : 'AWS',
   "from" : 'CloudTrail',
   "color" : 'gray'
}
module.exports = FILTER_CONFIG;
