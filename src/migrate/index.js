'use strict';

const queued_solutions = require('./queued_solutions');


class Upgrader {

  constructor(ref, token) {
    this.ref = ref.root().child('meta/version');
    this.token = token;
    this.routines = [
      queued_solutions
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

  next() {
    this.routines.sort(r => r.version);

    return this.version().then(
      version => this.routines.filter(r => r.version > version).slice(0, 1).pop()
    ).then(
      routine => routine.start(this.ref, this.token)
    ).then(
      version => this.bump(version)
    );
  }
}

exports.upgrader = (ref, token) => new Upgrader(ref, token);
