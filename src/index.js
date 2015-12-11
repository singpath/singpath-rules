'use strict';

const logger = require('./logger');
const migrate = require('./migrate');
const rest = require('./rest');
const tokens = require('./tokens');

exports.auth = tokens.auth;
exports.logger = (stream, level) => logger.create(stream, level);
exports.logger.levels = logger.levels;
exports.migrate = (ref, token, opts) => migrate.factory(ref, token, opts);
exports.restClient = rest.client;
