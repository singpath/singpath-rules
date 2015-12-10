'use strict';

const rest = require('./rest');
const tokens = require('./tokens');
const migrate = require('./migrate');

exports.restClient = rest.client;
exports.auth = tokens.auth;
exports.migrate = (ref, token) => migrate.factory(ref, token);

