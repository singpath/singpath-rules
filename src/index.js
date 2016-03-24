'use strict';

const logger = require('./logger');
const migrate = require('./migrate');
const tokens = require('./tokens');

exports.auth = tokens.auth;
exports.logger = (stream, level) => logger.create(stream, level);
exports.logger.levels = logger.levels;
exports.migrate = (ref, token, opts) => migrate.factory(ref, token, opts);
