# firebase-rules

[![Build Status](https://travis-ci.org/singpath/singpath-rules.svg)](https://travis-ci.org/singpath/singpath-rules)

Rules and migration scripts for Singpath Firbase db.

## Setup

You will need a Firebase DB dedicated to testing; you must not use your
production firebase DB.
```shell
EXPORT SINGPATH_RULES_FB_ID=singpath-testing-db-id
```
(Replace `singpath-testing-db-id` with that DB id)

Clone this repository and install dependencies:
```shell
git clone https://github.com/singpath/singpath-rules.git
cd firebase-rules
npm install
```

The rules are defined in `./rules/*.bolt` files using
[firebase-bolt](https://github.com/firebase/bolt/blob/v0.5.0/docs/language.md).

The tests are defined in `./e2e/*.js` files using
[firebase-test](https://github.com/singpath/firebase-test)


## Building json rules

Firebase will support bolt rules directly sometime, but for now we need them
in the current json encoded form.

```shell
npm run all-rules
```

You will find the rules in `rules.json`.


## Uploading rules

You should use [firebase-tools](https://github.com/firebase/firebase-tools) to
upload rules and data.

To upload the rules:
```json
./node_modules/.bin/firebase deploy:rules -f singpath-db-id
```
(Replace `singpath-db-id` with your staging or production DB id)

## Uploading data

You should use [firebase-tools](https://github.com/firebase/firebase-tools) to
upload rules and data.

To upload the school and badge data:
```json
./node_modules/.bin/firebase data:set -f singpath-db-id /classMentors/badges data/classMentors/badges.json
./node_modules/.bin/firebase data:set -f singpath-db-id /classMentors/schools data/classMentors/schools.json
```
(Replace `singpath-db-id` with your staging or production DB id)


## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).

