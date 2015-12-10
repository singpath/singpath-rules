'use strict';

const migrateSolutions = require('./solutions');


class Migrater {

  constructor(ref, token) {
    this.ref = ref.root().child('meta/version');
    this.token = token;
    this._upgrades = [
      migrateSolutions
    ];
  }

  version() {
    return new Promise((resolve, reject) => {
      this.ref.once(
        'value',
        snapshot => resolve(snapshot.val() || 0),
        reject
      );
    });
  }

  bump(version) {
    return new Promise((resolve, reject) => {
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
        return version;
      }

      return nextUpgrade.upgrade(this.ref, this.token).then(
        newVersion => this.bump(newVersion)
      );
    });
  }

  revert() {
    return this.version().then(version => {
      const lastUpgrade = this.upgradeAt(version);

      if (lastUpgrade == null) {
        return version;
      }

      return lastUpgrade.revert(this.ref, this.token).then(
        newVersion => this.bump(newVersion)
      );
    });
  }
}

exports.factory = (ref, token) => new Migrater(ref, token);
