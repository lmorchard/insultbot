Insultron2000
-------------

This is a bot for insulting people automatically via ActivityPub.

## TODO

* Move outgoing delivery to separate queue tasks, reduce logging

* Better HTML views of various things for better browser experience

* Move read-only resources like webfinger, agent, and objects to static S3
  website hosting bucket

* Consider dropping DynamoDB for just S3?

* Record followers, periodically insult them

* Accept commands from owner to remote-control the bot
