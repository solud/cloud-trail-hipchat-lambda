# cloud-trail-hipchat-lambda
Lambda function to send HipChat messages based on Cloud Trail logs in S3.

Based on https://github.com/awslabs/aws-training-demo/tree/master/service/lambda/cloudtrail
Follow instructions there to get configured in CloudTrail, S3, and Lambda.

Installation
============
Basic installation after configuration is complete:
```
npm install
```
Edit `filter_config.js`
```
npm run zip
```
Then upload generated `cloudtrail.zip` to AWS Lambda. 

Filters
=======

Default filter in `regexp` config var:
```
^(?!Describe|List)([a-zA-Z]+)$
```
This regex filters all events that start with `Describe` or `List`. You can adjust this regex to filter or match against whatever events you want to show up in HipChat.

The `source` var is similar but is used to select the source of the message. 
Default is to catch everything (`.`) but you can adjust the regex to your liking, or uncomment the line above which contains some common event sources.
