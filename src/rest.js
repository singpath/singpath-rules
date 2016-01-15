'use strict';

const request = require('request');

class RestClient {

  constructor(root, auth) {
    this.root = root;

    this.client = request.defaults({
      baseUrl: root,
      json: true,
      qs: {auth}
    });
  }

  get(path, query) {
    const opts = {url: path + '.json'};

    if (query == null) {
      opts.qs = {};
    } else if (query === true) {
      opts.qs = {shallow: true};
    } else {
      opts.qs = query;
    }

    return new Promise((resolve, reject) => {
      this.client.get(opts, this.makeCb(resolve, reject));
    });
  }

  set(path, data, log) {
    const opts = {url: path + '.json', json: data};

    return new Promise((resolve, reject) => {
      this.client.put(opts, this.makeCb(resolve, reject, log, opts.url, data));
    });
  }

  makeCb(resolve, reject, log, path, payload) {
    return (err, msg, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }

      if (log) {
        log({path, success: err == null, data: payload, baseUri: this.root});
      }
    };
  }
}

exports.client = (root, token) => new RestClient(root, token);

