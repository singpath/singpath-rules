# firebase-rules

[![Build Status](https://travis-ci.org/singpath/singpath-rules.svg)](https://travis-ci.org/singpath/singpath-rules)
[![Coverage Status](https://coveralls.io/repos/singpath/singpath-rules/badge.svg?branch=master&service=github)](https://coveralls.io/github/singpath/singpath-rules?branch=master)

Rules and migration scripts for Singpath Firbase db.

## Requirements

- node 4+; you can use something like [nvm](https://github.com/creationix/nvm)
  to install multiple node version.
- one or more [Firebase](https://firebase.com) project. If it will be used
  in production, you should have at production and a staging db


## Setup

We will rely [firebase-tools](https://github.com/firebase/firebase-tools) to
upload data.

1. setup a new npm project and install dependencies:

        ```shell
        npm install -g firebase-tools
        npm install -g @singpath/singpath-rules
        ```

2. setup a Firebase project in the current directory (it should like
   to your staging DB):

        ```shell
        npm init
        firebase init
        firebase login
        ```

3. edit firebase.json to add the "rules" entry:

        ```json
        {
          "firebase": "singpath-dev",
          "rules": "rules.json",
          "public": "public",
          "ignore": [
            "firebase.json",
            "**/.*",
            "**/node_modules/**"
          ]
        }
        ```

4. upload rules and seed data to your Firebase DB.

        ```
        singpath-rules init-db
        ```


## Building json rules

`firebase-tools` (see below) will support bolt rules directly sometime in the
future, but for now we need them in the current json encoded form.

To compile the rules:
```shell
singpath-rules compile
```

You will find the rules in `rules.json`.


## Uploading rules

```json
./node_modules/.bin/singpath-rules upload-rules
```

Use the `-f` to switch the Firebase DB to upload to and `-a` to set the secret.


## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).

