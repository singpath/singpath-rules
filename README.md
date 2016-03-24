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
        npm init
        npm install --save firebase-tools
        npm install --save singpath/singpath-rules
        ```

2. setup a Firebase project in the current directory (it should like
   to your staging DB):

        ```shell
        ./node_modules/.bin/firebase init
        ./node_modules/.bin/firebase login
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

Because `firebase-tools` and `singpath-rules` are installed locally you need to
use `./node_modules/.bin/[script-name]`. For recurrent tasks using it,
you should add a "scripts" entry in `package.json` which will have
`./node_modules/.bin` in its path when executed with `npm run`.

E.g, `package.json`:
```json
{
  "name": "rules",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "rules": "singpath-rules compile",
    "deploy-rules": "singpath-rules upload-rules -f my-firebase-production-id",
    "deploy-rules-production": "firebase deploy:rules -f my-firebase-production-id"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "firebase-tools": "^2.1.1",
    "singpath-rules": "github:singpath/singpath-rules"
  }
}
```


## Building json rules

`firebase-tools` (see below) will support bolt rules directly sometime in the
future, but for now we need them in the current json encoded form.

To compile the rules (from `node_modules/singpath-rules/rules`):
```shell
./node_modules/.bin/singpath-rules compile
```

You will find the rules in `rules.json`.


## Uploading rules

```json
./node_modules/.bin/singpath-rules upload-rules
```

Use the `-f` to switch the Firebase DB to upload to and `-a` to set the secret.


## Uploading data

To upload the school and badge data:
```json
./node_modules/.bin/firebase data:set \
    /classMentors/badges \
    node_modules/singpath-rules/data/classMentors/badges.json
./node_modules/.bin/firebase data:set \
    /classMentors/schools \
    node_modules/singpath-rules/data/classMentors/schools.json
```


## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).

