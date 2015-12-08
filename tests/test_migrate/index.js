'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const migrate = require('../../src/migrate');

describe('migrate', () => {

  describe('updater', () => {
    let ref;

    beforeEach(() => {
      ref = {
        root: sinon.stub().returnsThis(),
        child: sinon.stub().returnsThis()
      };
    });

    it('should set the firebase reference /meta/version path', () => {
      const upgrader = migrate.upgrader(ref, 'some-user-token');

      sinon.assert.calledOnce(ref.root);
      sinon.assert.calledOnce(ref.child);
      sinon.assert.calledWithExactly(ref.child, 'meta/version');
      expect(upgrader.ref).to.be(ref);
    });

    describe('version', () => {
      let snapshot, upgrader;

      beforeEach(() => {
        snapshot = {
          val: sinon.stub().returns(1)
        };

        ref.once = sinon.stub().callsArgWith(1, snapshot);

        upgrader = migrate.upgrader(ref, 'some-token');
      });

      it('should query the value of meta/version', done => {
        upgrader.version().then(() => {
          sinon.assert.calledOnce(ref.once);
          done();
        }).catch(done);
      });

      it('should resolve to the value of the firebase evelemt', done => {
        upgrader.version().then(version => {
          expect(version).to.be(1);
          done();
        }).catch(done);
      });

      it('should resolve to zero of the firebase element is undefined', done => {
        snapshot.val.returns(null);

        upgrader.version().then(version => {
          expect(version).to.be(0);
          done();
        }).catch(done);
      });

      it('should return a rejected promise if the value query fails', done => {
        const err = new Error();

        ref.once.callsArgWith(2, err);

        upgrader.version().then(
          () => Promise.reject(new Error('unexpected')),
          e => expect(e).to.be(err)
        ).then(() => done(), done);
      });

    });

    describe('bump', () => {
      let upgrader;

      beforeEach(() => {
        ref.set = sinon.stub().yields(null);

        upgrader = migrate.upgrader(ref, 'some-token');
      });

      it('should update the db version', done => {
        upgrader.bump(2).then(() => {
          sinon.assert.calledOnce(ref.set);
          sinon.assert.calledWith(ref.set, 2);
          done();
        }).catch(done);
      });

      it('should return a rejected promise if the update fails', done => {
        const err = new Error();

        ref.set.yields(err);

        upgrader.bump(2).then(
          () => Promise.reject(new Error('unexpected')),
          e => expect(e).to.be(err)
        ).then(() => done(), done);
      });

    });

    describe('next', () => {
      const makeRoutine = version => {
        return {
          version: version,
          upgrade: sinon.stub().returns(Promise.resolve(version))
        };
      };
      let upgrader;

      beforeEach(() => {
        upgrader = migrate.upgrader(ref, 'some-token');
        sinon.stub(upgrader, 'version').returns(Promise.resolve(0));
        sinon.stub(upgrader, 'bump').returns(Promise.resolve());
      });

      it('should return promise resolving to the current version if there are not any upgrade routines', done => {
        upgrader.routines = [];
        upgrader.next().then(version => {
          expect(version).to.be(0);
          done();
        }).catch(done);
      });

      it('should run the next routine', done => {
        upgrader.routines = [6, 0, 5, 4].map(v => makeRoutine(v));
        const expected = upgrader.routines[3];

        upgrader.version.returns(Promise.resolve(1));
        upgrader.bump.returns(Promise.resolve(expected.version));

        upgrader.next().then(() => {
          sinon.assert.calledOnce(expected.upgrade);
          sinon.assert.calledWithExactly(expected.upgrade, upgrader.ref, upgrader.token);
          done();
        }).catch(done);
      });

      it('should run bump version to the routine version', done => {
        upgrader.routines = [6, 0, 5, 4].map(v => makeRoutine(v));
        const expected = upgrader.routines[3];

        upgrader.version.returns(Promise.resolve(1));
        upgrader.bump.returns(Promise.resolve(expected.version));

        upgrader.next().then(() => {
          sinon.assert.calledOnce(upgrader.bump);
          sinon.assert.calledWithExactly(upgrader.bump, expected.version);
          done();
        }).catch(done);
      });

      it('should resolve to the bumped version', done => {
        upgrader.routines = [6, 0, 5, 4].map(v => makeRoutine(v));
        const expected = upgrader.routines[3];

        upgrader.version.returns(Promise.resolve(1));
        upgrader.bump.returns(Promise.resolve(expected.version));

        upgrader.next().then(version => {
          expect(version).to.be(expected.version);
          done();
        }).catch(done);
      });

    });

  });

});
