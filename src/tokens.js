'use strict';

const Configstore = require('configstore');
const request = require('request');
const url = require('url');

const config = new Configstore('firebase-tools');


function getToken(firebaseId, session) {
  session = session || config.get('session');

  if (!session || !session.token) {
    return Promise.reject(new Error('You must run "firebase login" first.'));
  }

  if (!session.expires || session.expires < Date.now()) {
    return Promise.reject(new Error('Your session has expired. run "firebase login".'));
  }

  return new Promise((resolve, reject) => {
    request.get({
      url: `https://admin.firebase.com/firebase/${firebaseId}/token`,
      json: true,
      qs: {
        auth: true,
        token: session.token
      }
    }, (err, msg, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  }).then(data => {
    return data.personalToken;
  });
}

function auth(ref, session) {
  const baseUrl = ref.root().toString();
  const firebaseId = url.parse(baseUrl).hostname.split('.', 1).pop();

  return getToken(firebaseId, session).then(token => {
    return new Promise((resolve, reject) => {
      ref.authWithCustomToken(token, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}


exports.get = getToken;
exports.auth = auth;
