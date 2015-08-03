var FILTER_CONFIG = require('./filter_config.js');
console.log('Loading Lambda function');

var aws = require('aws-sdk');
var Q   = require('q');
var fs  = require('fs')
var hipchat = require('node-hipchat');
var HC = new hipchat(FILTER_CONFIG.apiAuthToken);

function init() {
   var deferred = Q.defer();
   deferred.resolve(FILTER_CONFIG);
   return deferred.promise;
}

function sendNotification(msg, roomId, fromName) {
    var deferred = Q.defer();
    var message = {
      room : roomId,
      from : fromName,
      message : msg,
      message_format : 'html',
      notify : false,
      color : FILTER_CONFIG.color
    };
    deferred.resolve(message);
    HC.postMessage(message, function(data) {
      console.log("Sent message.");
    });
    return deferred.promise;
}

function download(bucket, key) {

  // extract file name from key name
  var fileName = key.match(/.*\/(.*).json.gz$/)[1]
  var file     = fs.createWriteStream('/tmp/' + fileName + '.json.gz');

  // pipe from S3 to local file
  var s3     = new aws.S3({apiVersion: '2006-03-01'});
  var params = { Bucket:bucket, Key:key };
  var stream = s3.getObject(params).createReadStream();
  stream.pipe(file);

  var deferred = Q.defer();
  stream.on('error', function (error) {
    console.log(error);
    deferred.reject(error);
  });

  stream.on('end', function () {
    console.log('End of read stream');
    deferred.resolve(file);
  });
  return deferred.promise;
}

function extract(file) {

  // find the GZ file name
  var gzFileName = file.path.match(/.*\/(.*).json.gz$/)[1];
  var jsFileName = '/tmp/' + gzFileName + '.json';

  // unzip the file to local file system
  var zlib = require('zlib');
  var unzip = zlib.createGunzip();
  var inp   = fs.createReadStream(file.path);
  var out   = fs.createWriteStream(jsFileName);

  console.log("Going to extract \n" + file.path + "\nto\n" + jsFileName);
  inp.pipe(unzip).pipe(out);

  var deferred = Q.defer();
  out.on('error', function (error) {
    console.log(error);
    deferred.reject(error);
  });

  out.on('close', function () {
    console.log('End of write stream');
    deferred.resolve(jsFileName);
  });
  return deferred.promise;
}

function filter(file) {
  console.log("Going to filter\n" + file);

  // filter every single record from the log file
  // returns an array containing every single matching records
  var cloudTrailLog = require(file);
  var records = cloudTrailLog.Records.filter(function(x) {
    return x.eventSource.match(new RegExp(FILTER_CONFIG.source));
  });

  console.log("Selected Records: " + records.length);
  //console.log(records);

  var deferred = Q.defer();
  deferred.resolve(records);
  return deferred.promise;
}

function notify(records) {

  var deferredTasks = Array();
  var spacer = '&nbsp;&nbsp;<b>·</b>&nbsp;&nbsp;'
  // search for record matching the regular expression
  for (var i = 0; i < records.length; i++) {
    if (records[i].eventName.match(new RegExp(FILTER_CONFIG.regexp)) || records[i].errorCode != undefined) {
      var message = "<span>" + records[i].eventTime.replace(/.*T/, ' ').replace(/Z/, ' ').replace(/\..+/, '') + "</span> :: " +
        "<span>Event: <b>" + records[i].eventName + "</b></span>" + spacer +
        "<span>Region: <b>" + records[i].awsRegion + "</b></span>" + spacer +
        "<span>Address: <b>" + records[i].sourceIPAddress + "</b></span>" + spacer +
        "<span>User: <b>" + records[i].userIdentity.userName + "</b></span><br>" +
        "<span>Agent: <b>" + records[i].userAgent + "</b></span>" + spacer +
        "<span>Source: " + records[i].eventSource + "</span>" +
        (records[i].requestParameters != undefined ? spacer + "<span><b>Params</b>: " + JSON.stringify(records[i].requestParameters, null, '') + "</span>" : '') +
        (records[i].errorCode != undefined ? "<br><span>Error: <b>" + records[i].errorCode + "</b> · " + records[i].errorMessage + "</span>" : '')
      console.log('Sending notification for record #' + i + 1)
      var task = sendNotification(message, FILTER_CONFIG.roomId, 'AXS Bot');
      deferredTasks.push(task);
    }
  }

  if (records.length > 0) {
    console.log("Done sending notifications");
  }
  return Q.all(deferredTasks);
}

exports.handler = function(event, context) {
   Q.allSettled(init()).then(function (result) {
      console.log('Received event:');
      console.log(JSON.stringify(event, null, '  '));

      var bucket = event.Records[0].s3.bucket.name;
      var key    = event.Records[0].s3.object.key;

     // Download from S3, Gunzip, Filter and send notifications
     download(bucket, key)
     .then(extract)
     .then(filter)
     .then(notify)
     .catch(function (error) {
       // Handle any error from all above steps
       console.error(
         'Error: ' + error
       );
     })
     .done(function() {
       console.log(
         'Finished handling ' + bucket + '/' + key
       );
       context.done(null, "Done!");
     });
  });
};
