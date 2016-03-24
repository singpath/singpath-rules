'use strict';

const migrateSolutions = require('./solutions');
const migrateJavaProblems = require('./java-problems');

const noop = () => undefined;

class Migrater {

  constructor(ref, token, opts) {
    this.ref = ref.root().child('meta/version');
    this.token = token;
    this._upgrades = [
      migrateSolutions,
      migrateJavaProblems
    ];

    this.opts = opts = opts || {};
    this.queryLog = opts.queryLog || noop;
    this.logger = opts.logger || {
      debug: noop,
      info: noop,
      error: noop
    };

    this.logger.debug('Handling migration of %s...', ref);
  }

  version() {
    return new Promise((resolve, reject) => {
      this.logger.debug('Getting version at %s...', this.ref);
      this.ref.once(
        'value',
        snapshot => resolve(snapshot.val() || 0),
        reject
      );
    });
  }

  bump(version) {
    return new Promise((resolve, reject) => {
      this.logger.debug('Updating version at %s to %s...', this.ref, version);
      this.ref.set(version, err => {
        if (err) {
          reject(err);
        } else {
          resolve(version);
        }
      });
    });
  }

  upgrades(version) {
    this._upgrades.sort((a, b) => a.version - b.version);
    return this._upgrades.filter(u => u.version > version);
  }

  upgradeAt(version) {
    this._upgrades.sort((a, b) => a.version - b.version);
    return this._upgrades.filter(r => r.version <= version).pop();
  }

  next() {
    return this.version().then(version => {
      const nextUpgrade = this.upgrades(version).slice(0, 1).pop();

      if (nextUpgrade == null) {
        this.logger.debug('No upgrade to apply...');

        return version;
      }

      this.logger.debug(
        'Upgrading to version %s: %s...',
        nextUpgrade.version, nextUpgrade.description
      );

      return nextUpgrade.upgrade(this.ref, this.token, this.opts).then(
        newVersion => this.bump(newVersion)
      );
    });
  }

  revert() {
    return this.version().then(version => {
      const lastUpgrade = this.upgradeAt(version);

      if (lastUpgrade == null) {
        this.logger.debug('No version to revert to...');
        return version;
      }

      this.logger.debug('Reverting to version %s...', lastUpgrade.version - 1);

      return lastUpgrade.revert(this.ref, this.token, this.opts).then(
        newVersion => this.bump(newVersion)
      );
    });
  }
}

exports.factory = (ref, token, opts) => new Migrater(ref, token, opts);
