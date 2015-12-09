'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const Firebase = require('firebase');
const migrateSolutions = require('../../src/migrate/solutions');
const rest = require('../../src/rest');


describe('migrate/solutions', () => {

  describe('Upgrader', () => {
    let upgrader, singpathRef, tasksRef, client;

    beforeEach(() => {
      client = {};
      sinon.stub(rest, 'client').returns(client);

      singpathRef = {
        update: sinon.stub().yields(null)
      };

      tasksRef = {
        push: sinon.stub().returns('someNewTaskId')
      };

      const ref = {
        root: sinon.stub().returnsThis(),
        child: sinon.stub(),
        toString: () => 'http://some-id.firebaseio.com/'
      };

      ref.child.withArgs('singpath').returns(singpathRef);
      ref.child.withArgs('singpath/queues/default/tasks').returns(tasksRef);

      upgrader = new migrateSolutions.Upgrader(ref, 'some-token');
    });

    afterEach(() => {
      rest.client.restore();
    });

    it('should create a rest client', () => {
      expect(upgrader.client).to.be.ok();
      sinon.assert.calledOnce(rest.client);
      sinon.assert.calledWithExactly(rest.client, 'http://some-id.firebaseio.com/', 'some-token');
    });

    it('should set reference for /singpath and /singpath/queues/default/tasks', () => {
      expect(upgrader.dest).to.be(singpathRef);
      expect(upgrader.taskDest).to.be(tasksRef);
    });

    describe('solution', () => {

      it('should return a promise resolving to a solved queued solution object', done => {
        const payload = {
          tests: '>>> hello\n"world"',
          solution: 'hello = "world"',
          language: 'python'
        };
        const resolution = {
          startedAt: 12345,
          endedAt: 12347,
          output: {
            solved: true,
            printed: '',
            results: {
              '0': {
                call: 'hello',
                correct: true,
                expected: '"world"',
                received: '"world"'
              }
            }
          }
        };
        const newSolution = {
          meta: {
            startedAt: 12345,
            endedAt: 12347,
            verified: true,
            solved: true,
            taskId: 'migrate-version-1',
            history: {
              '12345': 2
            }
          },
          payload: {
            tests: '>>> hello\n"world"',
            solution: 'hello = "world"',
            language: 'python'
          },
          results: {
            'migrate-version-1': {
              solved: true,
              printed: '',
              results: {
                '0': {
                  call: 'hello',
                  correct: true,
                  expected: '"world"',
                  received: '"world"'
                }
              }
            }
          }
        };

        upgrader.solution(payload, resolution).then(solution => {
          expect(solution).to.eql(newSolution);
          done();
        }).catch(done);
      });

      it('should return a promise resolving to a verified queued solution object', done => {
        const payload = {
          tests: '>>> hello\n"world"',
          solution: 'hello = "word"',
          language: 'python'
        };
        const resolution = {
          startedAt: 12345,
          endedAt: 12347,
          output: {
            solved: false,
            printed: '',
            results: {
              '0': {
                call: 'hello',
                correct: false,
                expected: '"world"',
                received: '"word"'
              }
            }
          }
        };
        const newSolution = {
          meta: {
            startedAt: 12345,
            endedAt: 12347,
            verified: true,
            solved: false,
            taskId: 'migrate-version-1'
          },
          payload: {
            tests: '>>> hello\n"world"',
            solution: 'hello = "word"',
            language: 'python'
          },
          results: {
            'migrate-version-1': {
              solved: false,
              printed: '',
              results: {
                '0': {
                  call: 'hello',
                  correct: false,
                  expected: '"world"',
                  received: '"word"'
                }
              }
            }
          }
        };

        upgrader.solution(payload, resolution).then(solution => {
          expect(solution).to.eql(newSolution);
          done();
        }).catch(done);
      });

      it('should return a promise solving to an unverified queued solution object', done => {
        const payload = {
          tests: '>>> hello\n"world"',
          solution: 'hello = "word"',
          language: 'python'
        };
        const resolution = {
          startedAt: 12345,
          endedAt: 12347
        };
        const newSolution = {
          meta: {
            startedAt: 12345,
            endedAt: 12347,
            verified: false,
            solved: false
          },
          payload: {
            tests: '>>> hello\n"world"',
            solution: 'hello = "word"',
            language: 'python'
          }
        };

        upgrader.solution(payload, resolution).then(solution => {
          expect(solution).to.eql(newSolution);
          done();
        }).catch(done);
      });
    });

    describe('solutionRef', () => {

      it('should return a solved solution ref', function() {
        const newSolution = {
          meta: {
            startedAt: 12345,
            endedAt: 12347,
            verified: true,
            solved: true,
            taskId: 'migrate-version-1',
            history: {
              '12345': 2
            }
          },
          payload: {
            tests: '>>> hello\n"world"',
            solution: 'hello = "world"',
            language: 'python'
          },
          results: {
            'migrate-version-1': {
              solved: true,
              printed: '',
              results: {
                '0': {
                  call: 'hello',
                  correct: true,
                  expected: '"world"',
                  received: '"world"'
                }
              }
            }
          }
        };

        expect(upgrader.solutionRef(newSolution)).to.eql({
          startedAt: 12345,
          duration: 2,
          language: 'python',
          solved: true
        });
      });

      it('should return an unsolved solution ref', function() {
        const newSolution = {
          meta: {
            startedAt: 12345,
            endedAt: 12347,
            verified: true,
            solved: false,
            taskId: 'migrate-version-1'
          },
          payload: {
            tests: '>>> hello\n"world"',
            solution: 'hello = "word"',
            language: 'python'
          },
          results: {
            'migrate-version-1': {
              solved: false,
              printed: '',
              results: {
                '0': {
                  call: 'hello',
                  correct: false,
                  expected: '"world"',
                  received: '"word"'
                }
              }
            }
          }
        };

        expect(upgrader.solutionRef(newSolution)).to.eql({
          startedAt: 12345,
          language: 'python',
          solved: false
        });
      });

    });

    describe('task', () => {

      it('should return a promise resoltion to task object', done => {
        const newSolution = {
          meta: {
            startedAt: 12345,
            endedAt: 12347,
            verified: false,
            solved: false
          },
          payload: {
            tests: '>>> hello\n"world"',
            solution: 'hello = "word"',
            language: 'python'
          }
        };

        client.get = sinon.stub().returns(Promise.resolve('aliceUid'));

        upgrader.task('somePathId', 'someLevelId', 'someProblemId', 'alice', newSolution).then(task => {
          sinon.assert.calledOnce(client.get);
          expect(task).to.eql({
            owner: 'aliceUid',
            payload: {
              tests: '>>> hello\n"world"',
              solution: 'hello = "word"',
              language: 'python'
            },
            createdAt: Firebase.ServerValue.TIMESTAMP,
            started: false,
            completed: false,
            consumed: false,
            solutionRef: 'singpath/queuedSolutions/somePathId/someLevelId/someProblemId/alice/default'
          });
          done();
        }).catch(done);
      });

    });

    describe('pathIds', () => {

      it('should query the list of path', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.pathIds().then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get, 'singpath/paths', true);
          done();
        }).catch(done);
      });

      it('should return a promise resolving to an array of path id', done => {
        client.get = sinon.stub().returns(Promise.resolve({
          somePathId: true,
          someOtherPathId: true
        }));

        upgrader.pathIds().then(ids => {
          expect(ids).to.have.length(2);
          expect(ids).to.contain('somePathId');
          expect(ids).to.contain('someOtherPathId');
          done();
        }).catch(done);
      });

      it('should resolve to an empty array if there are no path', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.pathIds().then(ids => {
          expect(ids).to.eql([]);
          done();
        }).catch(done);
      });

    });

    describe('levelIds', () => {

      it('should query the list of level', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.levelIds('somePathId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get, 'singpath/levels/somePathId', true);
          done();
        }).catch(done);
      });

      it('should return a promise resolving to an array of level id', done => {
        client.get = sinon.stub().returns(Promise.resolve({
          someLevelId: true,
          someOtherLevelId: true
        }));

        upgrader.levelIds('somePathId').then(ids => {
          expect(ids).to.have.length(2);
          expect(ids).to.contain('someLevelId');
          expect(ids).to.contain('someOtherLevelId');
          done();
        }).catch(done);
      });

      it('should resolve to an empty array if there are no level', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.levelIds('somePathId').then(ids => {
          expect(ids).to.eql([]);
          done();
        }).catch(done);
      });

    });

    describe('problemIds', () => {

      it('should query the list of problem', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.problemIds('somePathId', 'someLevelId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get, 'singpath/problems/somePathId/someLevelId', true);
          done();
        }).catch(done);
      });

      it('should return a promise resolving to an array of problem id', done => {
        client.get = sinon.stub().returns(Promise.resolve({
          someProblemId: true,
          someOtherProblemId: true
        }));

        upgrader.problemIds('somePathId', 'someLevelId').then(ids => {
          expect(ids).to.have.length(2);
          expect(ids).to.contain('someProblemId');
          expect(ids).to.contain('someOtherProblemId');
          done();
        }).catch(done);
      });

      it('should resolve to an empty array if there are no problem', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.problemIds('somePathId', 'someLevelId').then(ids => {
          expect(ids).to.eql([]);
          done();
        }).catch(done);
      });

    });

    describe('solutions', () => {

      it('should query the list of solution', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.solutions('somePathId', 'someLevelId', 'someProblemId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get, 'singpath/solutions/somePathId/someLevelId/someProblemId');
          done();
        }).catch(done);
      });

      it('should return a promise resolving to the list of solutions', done => {
        const solutions = {
          someId: {},
          someOtherId: {}
        };

        client.get = sinon.stub().returns(Promise.resolve(solutions));

        upgrader.solutions('somePathId', 'someLevelId', 'problemId').then(actual => {
          expect(actual).to.be(solutions);
          done();
        }).catch(done);
      });

      it('should resolve to an empty object if there are no solutions', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.solutions('somePathId', 'someLevelId', 'problemId').then(actual => {
          expect(actual).to.eql({});
          done();
        }).catch(done);
      });

    });

    describe('resolutions', () => {

      it('should query the list of resolution', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.resolutions('somePathId', 'someLevelId', 'someProblemId').then(() => {
          sinon.assert.calledOnce(client.get);
          sinon.assert.calledWithExactly(client.get, 'singpath/resolutions/somePathId/someLevelId/someProblemId');
          done();
        }).catch(done);
      });

      it('should return a promise resolving to the list of resolutions', done => {
        const resolutions = {
          someId: {},
          someOtherId: {}
        };

        client.get = sinon.stub().returns(Promise.resolve(resolutions));

        upgrader.resolutions('somePathId', 'someLevelId', 'problemId').then(actual => {
          expect(actual).to.be(resolutions);
          done();
        }).catch(done);
      });

      it('should resolve to an empty object if there are no resolution', done => {
        client.get = sinon.stub().returns(Promise.resolve(null));

        upgrader.resolutions('somePathId', 'someLevelId', 'problemId').then(actual => {
          expect(actual).to.eql({});
          done();
        }).catch(done);
      });

    });

    describe('migrateSolutions', () => {

      it('should query the problem solutions and resolution', done => {
        sinon.stub(upgrader, 'solutions').returns(Promise.resolve({}));
        sinon.stub(upgrader, 'resolutions').returns(Promise.resolve({}));

        upgrader.migrateSolutions('somePathId', 'someLevelId', 'somePathId').then(() => {
          sinon.assert.calledOnce(upgrader.solutions);
          sinon.assert.calledWithExactly(upgrader.solutions,
            'somePathId', 'someLevelId', 'somePathId'
          );

          sinon.assert.calledOnce(upgrader.resolutions);
          sinon.assert.calledWithExactly(upgrader.resolutions,
            'somePathId', 'someLevelId', 'somePathId'
          );
          done();
        }).catch(done);
      });

      it('should migrate each solution', done => {
        const payload = {
          tests: '>>> hello\n"world"',
          solution: 'hello = "word"',
          language: 'python'
        };
        const resolution = {
          startedAt: 12345,
          endedAt: 12347,
          output: {
            solved: false,
            printed: '',
            results: {
              '0': {
                call: 'hello',
                correct: false,
                expected: '"world"',
                received: '"word"'
              }
            }
          }
        };

        sinon.stub(upgrader, 'solutions').returns(Promise.resolve({
          bob: payload,
          alice: payload
        }));
        sinon.stub(upgrader, 'resolutions').returns(Promise.resolve({
          bob: resolution,
          alice: resolution,
          theOtherGuy: resolution
        }));
        sinon.stub(upgrader, 'solution').returns({some: 'data'});
        sinon.stub(upgrader, 'saveSolution').returns({});

        upgrader.migrateSolutions('somePathId', 'someLevelId', 'somePathId').then(() => {
          sinon.assert.calledTwice(upgrader.solution);
          upgrader.solution.args.forEach(args => expect(args).to.eql([payload, resolution]));

          sinon.assert.calledTwice(upgrader.saveSolution);
          expect(upgrader.saveSolution.args[0]).to.eql([
            'somePathId', 'someLevelId', 'somePathId', 'bob', {some: 'data'}
          ]);
          expect(upgrader.saveSolution.args[1]).to.eql([
            'somePathId', 'someLevelId', 'somePathId', 'alice', {some: 'data'}
          ]);
          done();
        }).catch(done);

      });

    });

    describe('migrateProblems', () => {

      it('should query a level problems', done => {
        sinon.stub(upgrader, 'problemIds').returns(Promise.resolve([]));

        upgrader.migrateProblems('somePathId', 'someLevelId').then(() => {
          sinon.assert.calledOnce(upgrader.problemIds);
          sinon.assert.calledWithExactly(upgrader.problemIds, 'somePathId', 'someLevelId');
          done();
        }).catch(done);
      });

      it('should migrate each problems solutions', done => {
        sinon.stub(upgrader, 'problemIds').returns(Promise.resolve(['id1', 'id2']));
        sinon.stub(upgrader, 'migrateSolutions').returns(Promise.resolve());

        upgrader.migrateProblems('somePathId', 'someLevelId').then(() => {
          sinon.assert.calledTwice(upgrader.migrateSolutions);
          sinon.assert.calledWithExactly(upgrader.migrateSolutions, 'somePathId', 'someLevelId', 'id1');
          sinon.assert.calledWithExactly(upgrader.migrateSolutions, 'somePathId', 'someLevelId', 'id2');
          done();
        }).catch(done);
      });

    });

    describe('migrateLevels', () => {

      it('should query a path levels', done => {
        sinon.stub(upgrader, 'levelIds').returns(Promise.resolve([]));

        upgrader.migrateLevels('somePathId').then(() => {
          sinon.assert.calledOnce(upgrader.levelIds);
          sinon.assert.calledWithExactly(upgrader.levelIds, 'somePathId');
          done();
        }).catch(done);
      });

      it('should migrate each level solutions', done => {
        sinon.stub(upgrader, 'levelIds').returns(Promise.resolve(['id1', 'id2']));
        sinon.stub(upgrader, 'migrateProblems').returns(Promise.resolve());

        upgrader.migrateLevels('somePathId').then(() => {
          sinon.assert.calledTwice(upgrader.migrateProblems);
          sinon.assert.calledWithExactly(upgrader.migrateProblems, 'somePathId', 'id1');
          sinon.assert.calledWithExactly(upgrader.migrateProblems, 'somePathId', 'id2');
          done();
        }).catch(done);
      });

    });

    describe('migratePaths', () => {

      it('should query paths', done => {
        sinon.stub(upgrader, 'pathIds').returns(Promise.resolve([]));

        upgrader.migratePaths().then(() => {
          sinon.assert.calledOnce(upgrader.pathIds);
          done();
        }).catch(done);
      });

      it('should migrate each path solutions', done => {
        sinon.stub(upgrader, 'pathIds').returns(Promise.resolve(['id1', 'id2']));
        sinon.stub(upgrader, 'migrateLevels').returns(Promise.resolve());

        upgrader.migratePaths().then(() => {
          sinon.assert.calledTwice(upgrader.migrateLevels);
          sinon.assert.calledWithExactly(upgrader.migrateLevels, 'id1');
          sinon.assert.calledWithExactly(upgrader.migrateLevels, 'id2');
          done();
        }).catch(done);
      });

    });

    describe('saveVerifiedSolution', () => {

      it('should save a queued solution', done => {
        const solution = {solution: 'data'};
        const solutionRef = {solution: 'ref'};

        sinon.stub(upgrader, 'solutionRef').returns(solutionRef);

        upgrader.saveVerifiedSolution(
          'somePathId', 'someLevelId', 'someProblemId', 'alice', solution
        ).then(() => {

          sinon.assert.calledOnce(upgrader.solutionRef);
          sinon.assert.calledWithExactly(upgrader.solutionRef, solution);

          sinon.assert.calledOnce(upgrader.dest.update);
          sinon.assert.calledWith(upgrader.dest.update, {
            'queuedSolutions/somePathId/someLevelId/someProblemId/alice/default': solution,
            'userProfiles/alice/queuedSolutions/somePathId/someLevelId/someProblemId/default': solutionRef
          });
          done();
        }).catch(done);

      });

    });

    describe('saveSolutionAndTask', () => {

      it('should save a queued solution', done => {
        const solution = {solution: 'data', meta: {}};
        const solutionRef = {solution: 'ref'};
        const task = {task: 'data'};

        sinon.stub(upgrader, 'task').returns(Promise.resolve(task));
        sinon.stub(upgrader, 'solutionRef').returns(solutionRef);
        upgrader.taskDest.push.returns('someNewTaskId');

        upgrader.saveSolutionAndTask(
          'somePathId', 'someLevelId', 'someProblemId', 'alice', solution
        ).then(() => {

          sinon.assert.calledOnce(upgrader.task);
          sinon.assert.calledWithExactly(upgrader.task,
            'somePathId', 'someLevelId', 'someProblemId', 'alice', solution
          );

          sinon.assert.calledOnce(upgrader.solutionRef);
          sinon.assert.calledWithExactly(upgrader.solutionRef, solution);

          sinon.assert.calledOnce(upgrader.dest.update);
          sinon.assert.calledWith(upgrader.dest.update, {
            'queuedSolutions/somePathId/someLevelId/someProblemId/alice/default': solution,
            'userProfiles/alice/queuedSolutions/somePathId/someLevelId/someProblemId/default': solutionRef,
            'queues/default/tasks/someNewTaskId': task
          });

          expect(solution.meta.taskId).to.be('someNewTaskId');
          done();
        }).catch(done);

      });

    });

    describe('saveSolution', () => {

      beforeEach(() => {
        sinon.stub(upgrader, 'saveVerifiedSolution').returns(Promise.resolve());
        sinon.stub(upgrader, 'saveSolutionAndTask').returns(Promise.resolve());
      });

      it('should save verifier solution without a new task', done => {
        const solution = {
          meta: {
            verified: true
          }
        };

        upgrader.saveSolution('somePathId', 'someLevelId', 'someProblemId', 'alice', solution).then(() => {
          sinon.assert.calledOnce(upgrader.saveVerifiedSolution);
          sinon.assert.calledWithExactly(upgrader.saveVerifiedSolution,
            'somePathId', 'someLevelId', 'someProblemId', 'alice', solution
          );
          done();
        }).catch(done);
      });

      it('should save unverifier solution with a new task', done => {
        const solution = {
          meta: {
            verified: false
          }
        };

        upgrader.saveSolution('somePathId', 'someLevelId', 'someProblemId', 'alice', solution).then(() => {
          sinon.assert.calledOnce(upgrader.saveSolutionAndTask);
          sinon.assert.calledWithExactly(upgrader.saveSolutionAndTask,
            'somePathId', 'someLevelId', 'someProblemId', 'alice', solution
          );
          done();
        }).catch(done);
      });
    });

    describe('start', () => {

      it('should miprate path problems', done => {
        sinon.stub(upgrader, 'migratePaths').returns(Promise.resolve());

        upgrader.start().then(() => {
          sinon.assert.calledOnce(upgrader.migratePaths);
          done();
        }).catch(done);
      });

      it('should resolve to the migration version', done => {
        sinon.stub(upgrader, 'migratePaths').returns(Promise.resolve());

        upgrader.start().then(version => {
          expect(version).to.be(migrateSolutions.version);
          done();
        }).catch(done);
      });

    });

  });

});
