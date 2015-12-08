'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const request = require('request');
const rest = require('../src/rest.js');

describe('rest', () => {

  describe('client', () => {

    describe('get', () => {

      let resp, token, client;

      beforeEach(() => {
        resp = {};
        sinon.stub(request, 'get').yields(null, null, resp);

        token = 'some-token';
        client = rest.client('some-id', token);
      });

      afterEach(() => {
        request.get.restore();
      });

      it('should return a promise fulfilled with the response data', done => {
        client.get('/foo/bar').then(data => {
          expect(data).to.be(resp);
          done();
        }).catch(done);
      });

      it('should return a promise rejected with the request error', done => {
        const err = new Error();

        request.get.yields(err, null, null);

        client.get('/foo/bar').then(
          () => Promise.reject(new Error('Unexpected return')),
          e => expect(e).to.be(err)
        ).then(() => done()).catch(done);
      });

      it('should send a json request', done => {
        client.get('/foo/bar').then(() => {
          sinon.assert.calledWithExactly(
            request.get,
            sinon.match.has('json', true),
            sinon.match.func
          );
          done();
        }).catch(done);
      });

      it('should send an authenticated request', done => {
        client.get('/foo/bar').then(() => {
          sinon.assert.calledWithExactly(
            request.get,
            sinon.match.has('qs', sinon.match.has('auth', token)),
            sinon.match.func
          );
          done();
        }).catch(done);
      });

      it('can send shallow request ', done => {
        client.get('/foo/bar', true).then(() => {
          sinon.assert.calledWithExactly(
            request.get,
            sinon.match.has('qs', sinon.match.has('shallow', true)),
            sinon.match.func
          );
          done();
        }).catch(done);
      });

    });

  });

});
