'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const migrateJavaProblems = require('../../src/migrate/java-problems');
const rest = require('../../src/rest');


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
      sinon.stub(rest, 'client').returns(client);

      const ref = {
        root: sinon.stub().returnsThis(),
        toString: () => 'http://some-id.firebaseio.com/'
      };

      upgrader = new migrateJavaProblems.Upgrader(ref, 'some-token');
    });

    afterEach(() => {
      rest.client.restore();
    });

    it('should create a rest client', () => {
      expect(upgrader.client).to.be.ok();
      sinon.assert.calledOnce(rest.client);
      sinon.assert.calledWithExactly(rest.client, 'http://some-id.firebaseio.com/', 'some-token');
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
      });

      it('should query paths', () => {
        return upgrader.migratePaths('somePathId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get, 'singpath/paths');
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
      });

      it('should query a list of level', () => {
        return upgrader.migrateLevels('somePathId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get, 'singpath/levels/somePathId', true);
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
      });

      it('should query problems', () => {

        return upgrader.migrateProblemTests('somePathId', 'someLevelId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(
            client.get,
            'singpath/problems/somePathId/someLevelId'
          );
        });
      });

      it('should update problems tests', () => {
        const solutions = {'someProblemId' : {'tests': INPUT}};

        client.get.returns(Promise.resolve(solutions));

        return upgrader.migrateProblemTests('somePathId', 'someLevelId').then(() => {
          sinon.assert.calledOnce(client.set);
          sinon.assert.calledWithExactly(
            client.set,
            'singpath/problems/somePathId/someLevelId/someProblemId/tests',
            OUTPUT,
            upgrader.queryLog
          );
        });
      });

    });

    describe('migrateSolutionsTests', () => {

      it('should query solution', () => {

        return upgrader.migrateSolutionsTests('somePathId', 'someLevelId', 'someProblemId', 'some code').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(
            client.get,
            'singpath/queuedSolutions/somePathId/someLevelId/someProblemId'
          );
        });
      });

      it('should update payload tests', () => {
        const solutions = {
          'bob' : {'default': {payload: {tests: 'some other code'}}},
          'alice' : {'default': {}}
        };

        client.get.returns(Promise.resolve(solutions));

        return upgrader.migrateSolutionsTests('somePathId', 'someLevelId', 'someProblemId', 'some code').then(() => {
          sinon.assert.calledOnce(client.set);
          sinon.assert.calledWithExactly(
            client.set,
            'singpath/queuedSolutions/somePathId/someLevelId/someProblemId/bob/default/payload/tests',
            'some code',
            upgrader.queryLog
          );
        });
      });

    });

    describe('migrateTaskTests', () => {

      it('should query non completed task', () => {
        upgrader.migrateTaskTests();

        sinon.assert.calledOnce(client.get);
        sinon.assert.calledWithExactly(
          client.get,
          'singpath/queues/default/tasks',
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
          sinon.assert.calledWithExactly(
            client.set,
            'singpath/queues/default/tasks/someTaskId/payload/tests',
            OUTPUT,
            upgrader.queryLog
          );
        });
      });

    });

  });

});
