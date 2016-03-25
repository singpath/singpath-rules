'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const request = require('request');
const tokens = require('../src/tokens.js');

describe('tokens', () => {
  let resp, session;

  beforeEach(() => {
    session = {
      token: 'some-token',
      expires: Date.now() + (1000 * 60 * 60 * 24 * 365)
    };
    resp = {
      personalToken: 'some-personal-token',
      firebaseToken: 'some-firebase-token'
    };
    sinon.stub(request, 'get').yields(null, null, resp);
  });

  afterEach(() => {
    request.get.restore();
  });

  describe('get', () => {

    it('should return a rejected promise if the session has no token', done => {
      tokens.get('some-id', {}).then(
        () => new Error('unexpected'),
        err => expect(err).to.be.an(Error)
      ).then(() => done(), done);
    });

    it('should return a rejected promise if the session has expired', done => {
      tokens.get('some-id', {
        token: 'some-token',
        expires: Date.now() - 1
      }).then(
        () => new Error('unexpected'),
        err => expect(err).to.be.an(Error)
      ).then(() => done(), done);
    });

    it('should return promise resolving the the user token', done => {
      tokens.get('some-id', session).then(token => {
        expect(token).to.be('some-personal-token');
        done();
      }).catch(done);
    });

    it('should return a rejected promise if the token request fails', done => {
      const err = new Error();

      request.get.yields(err, null, null);

      tokens.get('some-id', session).then(
        () => Promise.reject(new Error('unexpected')),
        e => expect(e).to.be(err)
      ).then(() => done(), done);
    });

    it('should returns a rejected promise if the token request returns an error', done => {
      const error = {
        code: 'INVALID_FIREBASE',
        message: 'Invalid Firebase specified.'
      };

      request.get.yields(null, null, {error});

      tokens.get('some-id', session).then(
        () => done(new Error('unexpected')),
        () => done()
      );
    });

    it('should query the admin firebase handler', done => {
      tokens.get('some-id', session).then(() => {
        sinon.assert.calledWithExactly(
          request.get,
          sinon.match.has('url', 'https://admin.firebase.com/firebase/some-id/token'),
          sinon.match.func
        );
        done();
      }).catch(done);
    });

    it('should send a json request', done => {
      tokens.get('some-id', session).then(() => {
        sinon.assert.calledWithExactly(
          request.get,
          sinon.match.has('json', true),
          sinon.match.func
        );
        done();
      }).catch(done);
    });

    it('should authenticate the request', done => {
      tokens.get('some-id', session).then(() => {
        sinon.assert.calledWithExactly(
          request.get,
          sinon.match.has('qs', sinon.match.has('auth', true)),
          sinon.match.func
        );
        sinon.assert.calledWithExactly(
          request.get,
          sinon.match.has('qs', sinon.match.has('token', 'some-token')),
          sinon.match.func
        );
        done();
      }).catch(done);
    });

  });

  describe('auth', () => {
    let ref;

    beforeEach(() => {
      ref = {
        root: sinon.stub().returns('https://some-id.firebaseio.com/'),
        authWithCustomToken: sinon.stub().yields(null)
      };
    });

    it('should request a token for the correct firebase id', done => {
      tokens.auth(ref, session).then(() => {
        sinon.assert.calledWithExactly(
          request.get,
          sinon.match.has('url', 'https://admin.firebase.com/firebase/some-id/token'),
          sinon.match.func
        );
        done();
      }).catch(done);
    });

    it('should authenticate the firebase session', done => {
      tokens.auth(ref, session).then(() => {
        sinon.assert.calledWithExactly(
          ref.authWithCustomToken,
          'some-personal-token',
          sinon.match.func
        );
        done();
      }).catch(done);
    });

    it('should return a rejected promise if the authentication failed', done => {
      const err = new Error();

      ref.authWithCustomToken.yields(err);
      tokens.auth(ref, session).then(
        () => Promise.reject(new Error('unexpected')),
        e => expect(e).to.be(err)
      ).then(() => done(), done);
    });

  });

});
