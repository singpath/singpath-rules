'use strict';

const rest = require('./rest');
const tokens = require('./tokens');
const migrate = require('./migrate');

exports.migrate = migrate;
exports.restClient = rest.client;
exports.getToken = tokens.get;

