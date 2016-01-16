'use strict';

require('./test_migrate_solutions');
require('./test_migrate_java_problems');


const expect = require('expect.js');
const sinon = require('sinon');
const migrate = require('../../src/migrate');

describe('Migrator', () => {

  describe('updater', () => {
    const makeUpgrade = version => {
      return {
        version: version,
        description: `description for ${version}`,
        upgrade: sinon.stub().returns(Promise.resolve(version)),
        revert: sinon.stub().returns(Promise.resolve(version - 1))
      };
    };

    let ref;

    beforeEach(() => {
      ref = {
        root: sinon.stub().returnsThis(),
        child: sinon.stub().returnsThis()
      };
    });

    it('should set the firebase reference /meta/version path', () => {
      const upgrader = migrate.factory(ref, 'some-user-token');

      sinon.assert.calledOnce(ref.root);
      sinon.assert.calledOnce(ref.child);
      sinon.assert.calledWithExactly(ref.child, 'meta/version');
      expect(upgrader.ref).to.be(ref);
    });

    describe('upgrades', () => {
      let upgrader;

      beforeEach(() => {
        upgrader = migrate.factory(ref, 'some-token');
        upgrader._upgrades = [6, 1, 5, 4].map(v => makeUpgrade(v));
      });

      it('should return the list upgrade after a specific version', () => {
        const upgrades = upgrader.upgrades(1);
        expect(upgrades).to.have.length(3);
      });

      it('should return a sorted list upgrade', () => {
        const upgrades = upgrader.upgrades(0);

        upgrades.reduce((prev, curr) => {
          expect(curr.version ).to.be.greaterThan(prev.version);
          return curr;
        });
      });

      it('should return an empty array if there are no upgrade left', () => {
        const upgrades = upgrader.upgrades(6);
        expect(upgrades).to.have.length(0);
      });

    });

    describe('upgradeAt', () => {
      let upgrader;

      beforeEach(() => {
        upgrader = migrate.factory(ref, 'some-token');
        upgrader._upgrades = [6, 1, 5, 4].map(v => makeUpgrade(v));
      });

      it('should return the upgrade equal a specific version', () => {
        const upgrade = upgrader.upgradeAt(1);
        expect(upgrade.version).to.be(1);
      });

      it('should return the first upgrade below to the missing specific version', () => {
        const upgrade = upgrader.upgradeAt(3);
        expect(upgrade.version).to.be(1);
      });

      it('should return undefined if there are no version available below', () => {
        const upgrade = upgrader.upgradeAt(0);
        expect(upgrade).to.be(undefined);
      });

    });

    describe('version', () => {
      let snapshot, upgrader;

      beforeEach(() => {
        snapshot = {
          val: sinon.stub().returns(1)
        };

        ref.once = sinon.stub().callsArgWith(1, snapshot);

        upgrader = migrate.factory(ref, 'some-token');
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

        upgrader = migrate.factory(ref, 'some-token');
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
      let upgrader;

      beforeEach(() => {
        upgrader = migrate.factory(ref, 'some-token');
        sinon.stub(upgrader, 'version').returns(Promise.resolve(0));
        sinon.stub(upgrader, 'bump').returns(Promise.resolve());
      });

      it('should return promise resolving to the current version if there are not any upgrade upgrades', done => {
        upgrader._upgrades = [];
        upgrader.next().then(version => {
          expect(version).to.be(0);
          done();
        }).catch(done);
      });

      it('should run the next upgrade', done => {
        upgrader._upgrades = [6, 0, 5, 4].map(v => makeUpgrade(v));
        const expected = upgrader._upgrades[3];

        upgrader.version.returns(Promise.resolve(1));
        upgrader.bump.returns(Promise.resolve(expected.version));

        upgrader.next().then(() => {
          sinon.assert.calledOnce(expected.upgrade);
          sinon.assert.calledWithExactly(expected.upgrade, upgrader.ref, upgrader.token, {});
          done();
        }).catch(done);
      });

      it('should run bump version to the upgrade version', done => {
        upgrader._upgrades = [6, 0, 5, 4].map(v => makeUpgrade(v));
        const expected = upgrader._upgrades[3];

        upgrader.version.returns(Promise.resolve(1));
        upgrader.bump.returns(Promise.resolve(expected.version));

        upgrader.next().then(() => {
          sinon.assert.calledOnce(upgrader.bump);
          sinon.assert.calledWithExactly(upgrader.bump, expected.version);
          done();
        }).catch(done);
      });

      it('should resolve to the bumped version', done => {
        upgrader._upgrades = [6, 0, 5, 4].map(v => makeUpgrade(v));
        const expected = upgrader._upgrades[3];

        upgrader.version.returns(Promise.resolve(1));
        upgrader.bump.returns(Promise.resolve(expected.version));

        upgrader.next().then(version => {
          expect(version).to.be(expected.version);
          done();
        }).catch(done);
      });

    });

    describe('revert', () => {
      let upgrader;

      beforeEach(() => {
        upgrader = migrate.factory(ref, 'some-token');
        sinon.stub(upgrader, 'version').returns(Promise.resolve(0));
        sinon.stub(upgrader, 'bump').returns(Promise.resolve());
      });

      it('should return promise resolving to the current version if there are not version to revert to', done => {
        upgrader._upgrades = [];
        upgrader.revert().then(version => {
          expect(version).to.be(0);
          done();
        }).catch(done);
      });

      it('should run the current upgrade revert routine', done => {
        upgrader._upgrades = [6, 3, 1, 5].map(v => makeUpgrade(v));
        const expected = upgrader._upgrades[1];

        upgrader.version.returns(Promise.resolve(3));
        upgrader.bump.returns(Promise.resolve(expected.version - 1));

        upgrader.revert().then(() => {
          sinon.assert.calledOnce(expected.revert);
          sinon.assert.calledWithExactly(expected.revert, upgrader.ref, upgrader.token, {});
          done();
        }).catch(done);
      });

      it('should run bump version to the reverted version', done => {
        upgrader._upgrades = [6, 3, 1, 5].map(v => makeUpgrade(v));
        const expected = upgrader._upgrades[1];

        upgrader.version.returns(Promise.resolve(3));
        upgrader.bump.returns(Promise.resolve(expected.version - 1));

        upgrader.revert().then(() => {
          sinon.assert.calledOnce(upgrader.bump);
          sinon.assert.calledWithExactly(upgrader.bump, expected.version - 1);
          done();
        }).catch(done);
      });

      it('should resolve to the bumped version', done => {
        upgrader._upgrades = [6, 3, 1, 5].map(v => makeUpgrade(v));
        const expected = upgrader._upgrades[1];

        upgrader.version.returns(Promise.resolve(3));
        upgrader.bump.returns(Promise.resolve(expected.version - 1));

        upgrader.revert().then(version => {
          expect(version).to.be(expected.version - 1);
          done();
        }).catch(done);
      });

    });

    describe('_upgrades', () => {
      let upgrader;

      beforeEach(() => {
        upgrader = migrate.factory(ref, 'some-token');
      });

      it('should have version attribute', () => {
        upgrader.upgrades(0).forEach(r => expect(r.version).to.be.ok());
      });

      it('should have version attribute', () => {
        upgrader.upgrades(0).forEach(r => expect(r.description).to.be.ok());
      });

      it('should have a upgrade attribute (func)', () => {
        upgrader.upgrades(0).forEach(r => expect(r.upgrade).to.be.an('function'));
      });

      it('should have a revert attribute (func)', () => {
        upgrader.upgrades(0).forEach(r => expect(r.revert).to.be.an('function'));
      });

    });

  });

});
