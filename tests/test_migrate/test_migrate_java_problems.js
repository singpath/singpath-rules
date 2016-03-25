'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const migrateJavaProblems = require('../../src/migrate/java-problems');

const INPUT = `
SingPath sp = new SingPath();
assertEquals(1, sp.one());
`.trim();

const OUTPUT = `
import org.junit.Test;
import static org.junit.Assert.*;
import junit.framework.*;
import com.singpath.SolutionRunner;

public class SingPathTest extends SolutionRunner {

  @Test
  public void testCapitalize() throws Exception {
    SingPath sp = new SingPath();
    assertEquals(1, sp.one());
  }
}`.trim();

describe('migrate/java-problems', () => {

  describe('Upgrader', () => {
    let upgrader, client;

    beforeEach(() => {
      client = {
        get: sinon.stub().returns(Promise.resolve(null)),
        set: sinon.stub().returns(Promise.resolve())
      };

      const ref = {
        root: sinon.stub().returnsThis(),
        toString: () => 'http://some-id.firebaseio.com/'
      };

      upgrader = new migrateJavaProblems.Upgrader(ref, 'some-token');
    });

    it('should create a rest client', () => {
      expect(upgrader.client().toString()).to.be('http://some-id.firebaseio.com/.json');
    });

    describe('start', () => {
      beforeEach(() => {
        sinon.stub(upgrader, 'migratePaths').returns(Promise.resolve());
        sinon.stub(upgrader, 'migrateTaskTests').returns(Promise.resolve());
      });

      it('should migrate paths', () => {
        return upgrader.start().then(() => {
          sinon.assert.calledOnce(upgrader.migratePaths);
        });
      });

      it('should migrate paths', () => {
        return upgrader.start().then(() => {
          sinon.assert.calledOnce(upgrader.migrateTaskTests);
        });
      });

      it('should return the upgrade version', () => {
        return upgrader.start().then(
          version => expect(version).to.be(2)
        );
      });

    });

    describe('migratePaths', () => {
      beforeEach(() => {
        sinon.stub(upgrader, 'migrateLevels').returns(Promise.resolve());
        sinon.stub(upgrader, 'client').withArgs('singpath/paths').returns(client);
      });

      it('should query paths', () => {

        return upgrader.migratePaths('somePathId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get);
        });
      });

      it('should migrate problem tests', () => {
        const problems = {
          'somePathId': {language: 'java'},
          'somePythonPathId': {language: 'python'}
        };

        client.get.returns(Promise.resolve(problems));

        return upgrader.migratePaths().then(() => {
          sinon.assert.calledOnce(upgrader.migrateLevels);
          sinon.assert.calledWithExactly(upgrader.migrateLevels, 'somePathId');
        });
      });

    });

    describe('migrateLevels', () => {

      beforeEach(() => {
        sinon.stub(upgrader, 'migrateProblemTests').returns(Promise.resolve());
        sinon.stub(upgrader, 'client').withArgs('singpath/levels/somePathId').returns(client);
      });

      it('should query a list of level', () => {
        return upgrader.migrateLevels('somePathId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get, sinon.match({shallow: true}));
        });
      });

      it('should migrate problem tests', () => {
        const levels = {'someLevelId': true};

        client.get.returns(Promise.resolve(levels));

        return upgrader.migrateLevels('somePathId').then(() => {
          sinon.assert.calledOnce(upgrader.migrateProblemTests);
          sinon.assert.calledWithExactly(
            upgrader.migrateProblemTests, 'somePathId', 'someLevelId'
          );
        });
      });

    });

    describe('migrateProblemTests', () => {

      beforeEach(() => {
        sinon.stub(upgrader, 'migrateSolutionsTests').returns(Promise.resolve());
        sinon.stub(upgrader, 'client');

        upgrader.client.withArgs(
          'singpath/problems/somePathId/someLevelId'
        ).returns(client);

        upgrader.client.withArgs(
          'singpath/problems/somePathId/someLevelId/someProblemId/tests'
        ).returns(client);
      });

      it('should query problems', () => {

        return upgrader.migrateProblemTests('somePathId', 'someLevelId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get);
        });
      });

      it('should update problems tests', () => {
        const solutions = {'someProblemId': {'tests': INPUT}};

        client.get.returns(Promise.resolve(solutions));

        return upgrader.migrateProblemTests('somePathId', 'someLevelId').then(() => {
          sinon.assert.calledOnce(client.set);
          sinon.assert.calledWithExactly(client.set, OUTPUT);
        });
      });

    });

    describe('migrateSolutionsTests', () => {

      beforeEach(function() {
        sinon.stub(upgrader, 'client');
        upgrader.client.withArgs(
          'singpath/queuedSolutions/somePathId/someLevelId/someProblemId'
        ).returns(client);
        upgrader.client.withArgs(
          'singpath/queuedSolutions/somePathId/someLevelId/someProblemId/bob/default/payload/tests'
        ).returns(client);
      });

      it('should query solution', () => {

        return upgrader.migrateSolutionsTests('somePathId', 'someLevelId', 'someProblemId', 'some code').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get);
        });
      });

      it('should update payload tests', () => {
        const solutions = {
          'bob': {'default': {payload: {tests: 'some other code'}}},
          'alice': {'default': {}}
        };

        client.get.returns(Promise.resolve(solutions));

        return upgrader.migrateSolutionsTests('somePathId', 'someLevelId', 'someProblemId', 'some code').then(() => {
          sinon.assert.calledOnce(client.set);
          sinon.assert.calledWithExactly(client.set, 'some code');
        });
      });

    });

    describe('migrateTaskTests', () => {

      beforeEach(function() {
        sinon.stub(upgrader, 'client');
        upgrader.client.withArgs(
          'singpath/queues/default/tasks'
        ).returns(client);
        upgrader.client.withArgs(
          'singpath/queues/default/tasks/someTaskId/payload/tests'
        ).returns(client);
      });

      it('should query non completed task', () => {
        upgrader.migrateTaskTests();

        sinon.assert.calledOnce(client.get);
        sinon.assert.calledWithExactly(
          client.get,
          sinon.match({
            orderBy: '"completed"',
            equalTo: false
          })
        );
      });

      it('should update tasks with convertTests', () => {
        const tasks = {
          someTaskId: {
            payload: {
              language: 'java',
              tests: INPUT
            }
          },
          somePythonTask: {
            payload: {language: 'python'}
          }
        };

        client.get.returns(Promise.resolve(tasks));

        return upgrader.migrateTaskTests().then(() => {
          sinon.assert.calledOnce(client.set);
          sinon.assert.calledWithExactly(client.set, OUTPUT);
        });
      });

    });

  });

});
