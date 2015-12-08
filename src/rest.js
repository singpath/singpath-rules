'use strict';

const request = require('request');

class RestClient {

  constructor(root, auth) {
    this.client = request.defaults({
      baseUrl: root,
      json: true,
      qs: {auth}
    });
  }

  get(path, shallow) {
    const opts = {url: path + '.json'};

    if (shallow) {
      opts.qs = {shallow: true};
    }

    return new Promise((resolve, reject) => {
      this.client.get(opts, makeCb(resolve, reject));
    });
  }
}

exports.client = (root, token) => new RestClient(root, token);


function makeCb(resolve, reject) {
  return (err, msg, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  };
}
