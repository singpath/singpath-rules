'use strict';

const Firebase = require('firebase');
const fb = require('firebase-test');

const DEFAULT_AUTH_DATA = {
  isAdmin: false,
  isPremium: false,
  isWorker: false
};

// cannot use arrow function or this would be bind to global;
// but we need to set timeout.
describe('singpath', function() {
  let suite, auth, singpath, seed;
  let startedSolution, submittedSolution, verifiedSolution, solvedSolution, startedAt, duration;
  let consumedTask, pushedTask, startedTask;

  const startingSolution = () => {
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default = null;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default = null;
    singpath.queues.default.tasks.someTaskId = null;
    startedSolution.meta.startedAt = Firebase.ServerValue.TIMESTAMP;
  };
  const submittingSolution = () => {
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.solved = false;
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.duration = null;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default = startedSolution;
    singpath.queues.default.tasks.someTaskId = null;
    submittedSolution.meta.endedAt = pushedTask.createdAt = Firebase.ServerValue.TIMESTAMP;
  };
  const claimingTask = () => {
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.solved = false;
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.duration = null;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default = startedSolution;
    singpath.queues.default.tasks.someTaskId = pushedTask;
    startedTask.startedAt = Firebase.ServerValue.TIMESTAMP;
  };
  const unclaimingTask = () => {
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.solved = false;
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.duration = null;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default = submittedSolution;
    singpath.queues.default.tasks.someTaskId = startedTask;
  };
  const verifyingSolution = () => {
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.solved = false;
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.duration = null;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default = submittedSolution;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default.payload = verifiedSolution.payload;
    consumedTask.payload = startedTask.payload = verifiedSolution.payload;
    singpath.queues.default.tasks.someTaskId = startedTask;
    consumedTask.completedAt = Firebase.ServerValue.TIMESTAMP;
  };
  const solvingSolution = () => {
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.solved = false;
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.duration = null;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default = submittedSolution;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default.payload = solvedSolution.payload;
    consumedTask.payload = startedTask.payload = solvedSolution.payload;
    singpath.queues.default.tasks.someTaskId = startedTask;
    consumedTask.completedAt = Firebase.ServerValue.TIMESTAMP;
  };
  const updatingSolutionHistory = () => {
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.solved = false;
    singpath.userProfiles.alice.queuedSolutions.somePathId.someLevelId.someProblemId.default.duration = null;
    singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default.meta.history[1449108100000] = null;
  };

  this.timeout(5000);

  beforeEach(() => {
    suite = new fb.testSuite({
      firebaseId: process.env.SINGPATH_RULES_FB_ID,
      firebaseSecret: process.env.SINGPATH_RULES_FB_SECRET,
      defaultAuthData: DEFAULT_AUTH_DATA
    });

    auth = {
      publicIds: {
        'bob': 'bobUid',
        'alice': 'aliceUid',
        'someone': 'someoneUid'
      },
      usedPublicIds: {
        'bob': true,
        'alice': true,
        'someone': true
      },
      users: {
        bobUid: {
          id: 'bobUid',
          publicId: 'bob',
          fullName: 'Bob Smith',
          displayName: 'Bob',
          email: 'bob@example.com',
          gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d',
          createdAt: 1449108152692
        },
        aliceUid: {
          id: 'aliceUid',
          publicId: 'alice',
          fullName: 'Alice Smith',
          displayName: 'Alice',
          email: 'alice@example.com',
          gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d',
          createdAt: 1449108152692
        },
        someoneUid: {
          id: 'someoneUid',
          publicId: 'someone',
          fullName: 'John Doe',
          displayName: 'John Doe',
          email: 'someone@example.com',
          gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d',
          createdAt: 1449108152692
        }
      }
    };

    singpath = {
      admins: {
        'bobUid': true
      },
      userProfiles: {
        'bob': {
          user: {
            displayName: 'Bob',
            gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d',

            isAdmin: true
          }
        },
        'alice': {
          user: {
            displayName: 'Alice',
            gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
          },
          queuedSolutions: {
            somePathId:{
              someLevelId: {
                someProblemId: {
                  default: {
                    startedAt: 1449108100000,
                    duration: 100000,
                    language: 'python',
                    solved: true
                  }
                }
              }
            }
          }
        },
        'someone': {
          user: {
            displayName: 'John Doe',
            gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
          }
        }
      },
      paths: {
        somePathId: {
          title: 'Some title',
          description: 'Some description',
          language: 'python',
          owner: {
            publicId: 'alice',
            displayName: 'Alice',
            gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
          }
        }
      },
      levels: {
        somePathId: {
          someLevelId: {
            title: 'Some title',
            description: 'Some description',
            language: 'python',
            owner: {
              publicId: 'alice',
              displayName: 'Alice',
              gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
            }
          }
        }
      },
      problems: {
        somePathId: {
          someLevelId: {
            someProblemId: {
              title: 'Some title',
              description: 'Some description',
              language: 'python',
              owner: {
                publicId: 'alice',
                displayName: 'Alice',
                gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
              },
              tests: '>>> hello\n"world"'
            }
          }
        }
      },
      queuedSolutions: {
        somePathId: {
          someLevelId: {
            someProblemId: {
              alice: {
                default: {
                  meta: {
                    startedAt: 1449108100000,
                    endedAt: 1449108200000,
                    verified: true,
                    solved: true,
                    taskId: 'someTaskId',
                    history: {
                      '1449108100000': 100000
                    }
                  },
                  payload: {
                    tests: '>>> hello\n"world"',
                    solution: 'hello = "world"',
                    language: 'python'
                  },
                  results: {
                    someTaskId: {
                      solved: true,
                      printed: '',
                      results: [{
                        call: 'hello',
                        received: '"world"',
                        expected: '"world"',
                        correct: true
                      }]
                    }
                  }
                }
              }
            }
          }
        }
      },
      queues: {
        default: {
          workers: {
            someWorker: {
              startedAt: 1449108100000,
              presence: 1449108100000
            }
          },
          tasks: {
            someTaskId: {
              owner: 'aliceUid',
              payload: {
                tests: '>>> hello\n"world"',
                solution: 'hello = "world"',
                language: 'python'
              },
              createdAt: 1449108200000,
              started: true,
              startedAt: 1449108201000,
              completed: true,
              completedAt: 1449108202000,
              consumed: true,
              solutionRef: 'singpath/queuedSolutions/somePathId/someLevelId/someProblemId/alice/default',
              worker: 'someWorker'
            },
            somePullingTaskId: {
              owner: 'verifier-client',
              payload: {
                tests: '>>> hello\n"world"',
                solution: 'hello = "world"',
                language: 'python'
              },
              createdAt: 1449108200000,
              started: true,
              startedAt: 1449108201000,
              completed: true,
              completedAt: 1449108202000,
              consumed: false,
              worker: 'someWorker',
              results: {
                solved: true,
                printed: '',
                results: [{
                  call: 'hello',
                  received: '"world"',
                  expected: '"world"',
                  correct: true
                }]
              }
            }
          }
        }
      }
    };

    startedSolution = {
      meta: {
        startedAt: 1449108100000,
        verified: false,
        solved: false
      }
    };

    submittedSolution = {
      meta: {
        startedAt: 1449108100000,
        endedAt: 1449108200000,
        verified: false,
        solved: false,
        taskId: 'someTaskId'
      },
      payload: {
        tests: '>>> hello\n"world"',
        solution: 'hello = "world"',
        language: 'python'
      }
    };

    verifiedSolution = {
      meta: {
        startedAt: 1449108100000,
        endedAt: 1449108200000,
        verified: true,
        solved: false,
        taskId: 'someTaskId'
      },
      payload: {
        tests: '>>> hello\n"world"',
        solution: 'hello = "word"',
        language: 'python'
      },
      results: {
        someTaskId: {
          solved: false,
          printed: '',
          results: [{
            call: 'hello',
            received: '"word"',
            expected: '"world"',
            correct: false
          }]
        }
      }
    };

    solvedSolution = singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default;
    startedAt = solvedSolution.meta.startedAt;
    duration = solvedSolution.meta.endedAt - startedAt;

    pushedTask = {
      owner: 'aliceUid',
      payload: {
        tests: '>>> hello\n"world"',
        solution: 'hello = "world"',
        language: 'python'
      },
      createdAt: 1449108200000,
      started: false,
      completed: false,
      consumed: false,
      solutionRef: 'singpath/queuedSolutions/somePathId/someLevelId/someProblemId/alice/default'
    };

    startedTask = {
      owner: 'aliceUid',
      payload: {
        tests: '>>> hello\n"world"',
        solution: 'hello = "world"',
        language: 'python'
      },
      createdAt: 1449108200000,
      started: true,
      startedAt: 1449108201000,
      completed: false,
      consumed: false,
      solutionRef: 'singpath/queuedSolutions/somePathId/someLevelId/someProblemId/alice/default',
      worker: 'someWorker'
    };

    consumedTask = singpath.queues.default.tasks.someTaskId;

    seed = {auth, singpath};
  });

  afterEach(() => {
    suite.restore();
  });

  /**
   * Allow user to be set as Singpath Admin (in app admin).
   *
   * Only used for security rules; no read/write.
   *
   */
  describe('admins', () => {
    const path = 'singpath/admins/bob';

    it('should not be readable', done => {
      suite.with({}).as('bobUid').get(path).shouldFail(done);
    });

    it('should not be writable', done => {
      suite.with({}).as('bobUid').set(path, true).shouldFail(done);
    });
  });

  describe('userProfiles', () => {
    const userProfiles = 'singpath/userProfiles';

    it('should be readable', done => {
      suite.with({}).as('bobUid').get(userProfiles).ok(done);
    });

    describe('$publicId', () => {

      describe('user', () => {
        const bobProfile = userProfiles + '/bob/user';
        let bobProfileData;

        beforeEach(() => {
          bobProfileData = singpath.userProfiles.bob.user;
          bobProfileData.isAdmin = null;
          singpath.userProfiles.bob.user = null;
        });

        it('should be writable', done => {
          suite.with({auth}).as('bobUid').set(bobProfile, bobProfileData).ok(done);
        });

        it('should be editable (birthday)', done => {
          const ctx = suite.with({auth});

          ctx.as('bobUid').set(bobProfile, bobProfileData);
          ctx.update('/', {
            'auth/users/bobUid/yearOfBirth': 2000,
            'singpath/userProfiles/bob/user/yearOfBirth': 2000
          }).ok(done);
        });

        it('should keep profile in sync with user data (birthday)', done => {
          const ctx = suite.with({auth});

          ctx.as('bobUid').set(bobProfile, bobProfileData);
          ctx.update('/', {
            'singpath/userProfiles/bob/user/yearOfBirth': 2000
          }).shouldFail(done);
        });

        it('should be editable (country)', done => {
          const ctx = suite.with({auth});
          const country = {
            name: 'Singapore',
            code: 'SG'
          };

          ctx.as('bobUid').set(bobProfile, bobProfileData);
          ctx.update('/', {
            'auth/users/bobUid/country': country,
            'singpath/userProfiles/bob/user/country': country
          }).ok(done);
        });

        it('should keep profile in sync with user data (country)', done => {
          const ctx = suite.with({auth});
          const country = {
            name: 'Singapore',
            code: 'SG'
          };

          ctx.as('bobUid').set(bobProfile, bobProfileData);
          ctx.update('/', {
            'singpath/userProfiles/bob/user/country': country
          }).shouldFail(done);
        });

        it('should be editable (school)', done => {
          const ctx = suite.with({auth});
          const school = {
            'iconUrl': '/assets/crests/NUS_HS.jpeg',
            'id': 'NUS High School',
            'name': 'NUS High School',
            'type': 'Junior College'
          };

          ctx.as('bobUid').set(bobProfile, bobProfileData);
          ctx.update('/', {
            'auth/users/bobUid/school': school,
            'singpath/userProfiles/bob/user/school': school
          }).ok(done);
        });

        it('should keep profile in sync with user data (school)', done => {
          const ctx = suite.with({auth});
          const school = {
            'iconUrl': '/assets/crests/NUS_HS.jpeg',
            'id': 'NUS High School',
            'name': 'NUS High School',
            'type': 'Junior College'
          };

          ctx.as('bobUid').set(bobProfile, bobProfileData);
          ctx.update('/', {
            'singpath/userProfiles/bob/user/school': school
          }).shouldFail(done);
        });

        describe('isAdmin', function() {
          const isAdminPath = bobProfile + '/isAdmin';

          beforeEach(() => {
            singpath.userProfiles.bob.user = bobProfileData;
          });

          it('should show user as admin when allowed by singpath/admins', done => {
            suite.with({auth, singpath}).as('bobUid').set(isAdminPath, true).ok(done);
          });

          it('should not show user as admin if not allowed by singpath/admins', done => {
            singpath.admins.bobUid = false;
            suite.with({auth, singpath}).as('bobUid').set(isAdminPath, true).shouldFail(done);
          });

        });
      });

      describe('queuedSolutions', () => {

        describe('$pathId', () => {

          describe('$levelId', () => {

            describe('$problemId', () => {

              describe('$queueId', () => {
                const solutionRefPath = 'singpath/userProfiles/alice/queuedSolutions/somePathId/someLevelId/someProblemId/default';

                it('should be writable if it reflects the solution (1/2, started)', done => {
                  submittingSolution();
                  suite.with(seed).as('someoneUid').set(solutionRefPath, {
                    startedAt: startedAt,
                    language: singpath.paths.somePathId.language,
                    solved: false
                  }).ok(done);
                });

                it('should be writable if it reflects the solution (2/2, solved)', done => {
                  suite.with(seed).as('someoneUid').set(solutionRefPath, {
                    startedAt: startedAt,
                    language: singpath.paths.somePathId.language,
                    solved: true,
                    duration: duration
                  }).ok(done);
                });

                it('should not be writable if it does not reflect the solution (1/2, not started)', done => {
                  startingSolution();
                  suite.with(seed).as('someoneUid').set(solutionRefPath, {
                    startedAt: startedAt,
                    language: singpath.paths.somePathId.language,
                    solved: false
                  }).shouldFail(done);
                });

                it('should not be writable if it does not reflect the solution (2/2, not solved)', done => {
                  submittingSolution();
                  suite.with(seed).as('someoneUid').set(solutionRefPath, {
                    startedAt: startedAt,
                    language: singpath.paths.somePathId.language,
                    solved: true,
                    duration: duration
                  }).shouldFail(done);
                });

              });

            });

          });

        });

      });

    });
  });

  describe('paths', () => {
    const pathsPath = 'singpath/paths';

    it('should be researchable', done => {
      suite.with(seed).get(pathsPath).ok(done);
    });

    describe('$pathId', () => {
      const somePathPath = pathsPath + '/somePathId';
      const beforeWrite = () => singpath.paths.somePathId = null;
      let somePathData;


      beforeEach(() => {
        somePathData = singpath.paths.somePathId;
      });

      it('should be writable by admin', done => {
        beforeWrite();
        suite.with(seed).as('bobUid').set(somePathPath, somePathData).ok(done);
      });

      it('should not be writable by owner', done => {
        beforeWrite();
        suite.with(seed).as('aliceUid').set(somePathPath, somePathData).shouldFail(done);
      });

      it('should not be writable by anybody else', done => {
        beforeWrite();
        suite.with(seed).as('someoneUid').set(somePathPath, somePathData).shouldFail(done);
      });

      it('should be editable by admin', done => {
        singpath.admins.bobUid = true;
        suite.with(seed).as('bobUid').update(somePathPath, {title: 'some other title'}).ok(done);
      });

      it('should be editable by owner', done => {
        singpath.admins.aliceUid = false;
        suite.with(seed).as('aliceUid').update(somePathPath, {title: 'some other title'}).ok(done);
      });

      it('should not be editable by anybody else', done => {
        suite.with(seed).as('someoneUid').update(somePathPath, {title: 'some other title'}).shouldFail(done);
      });

      it('should be deletable by admin', done => {
        singpath.admins.bobUid = true;
        suite.with(seed).as('bobUid').update('singpath/', {
          'paths/somePathId': null,
          'levels/somePathId': null,
          'problems/somePathId': null,
          'queuedSolutions/somePathId': null
        }).ok(done);
      });

      it('should not be deletable by owner', done => {
        suite.with(seed).as('aliceUid').update('singpath/', {
          'paths/somePathId': null,
          'levels/somePathId': null,
          'problems/somePathId': null,
          'queuedSolutions/somePathId': null
        }).shouldFail(done);
      });

      it('should not be deletable by anybody else', done => {
        suite.with(seed).as('someoneUid').update('singpath/', {
          'paths/somePathId': null,
          'levels/somePathId': null,
          'problems/somePathId': null,
          'queuedSolutions/somePathId': null
        }).shouldFail(done);
      });

      it('should not be deletable while some of it levels exists', done => {
        singpath.admins.bobUid = true;
        suite.with(seed).as('bobUid').update('singpath/', {
          'paths/somePathId': null,
          'problems/somePathId': null,
          'queuedSolutions/somePathId': null
        }).shouldFail(done);
      });

      it('should not be deletable while some of it problems exists', done => {
        singpath.admins.bobUid = true;
        suite.with(seed).as('bobUid').update('singpath/', {
          'paths/somePathId': null,
          'levels/somePathId': null,
          'queuedSolutions/somePathId': null
        }).shouldFail(done);
      });

      it('should not be deletable while some of it solutions exists', done => {
        singpath.admins.bobUid = true;
        suite.with(seed).as('bobUid').update('singpath/', {
          'paths/somePathId': null,
          'levels/somePathId': null,
          'problems/somePathId': null
        }).shouldFail(done);
      });

    });
  });

  describe('levels', () => {
    const levelsPath = 'singpath/levels';

    it('should be researchable', done => {
      suite.with(seed).get(levelsPath).ok(done);
    });

    describe('$pathId', () => {

      describe('$levelId', () => {
        const someLevelPath = levelsPath + '/somePathId/someLevelId';
        const writing = () => singpath.levels.somePathId.someLevelId = null;
        let someLevelData;

        beforeEach(() => {
          someLevelData = singpath.levels.somePathId.someLevelId;
        });

        it('should be writable by admin', done => {
          writing();
          suite.with(seed).as('bobUid').set(someLevelPath, someLevelData).ok(done);
        });

        it('should be writable by owner', done => {
          writing();
          suite.with(seed).as('aliceUid').set(someLevelPath, someLevelData).ok(done);
        });

        it('should not be writable by anybody else', done => {
          writing();
          suite.with(seed).as('someoneUid').set(someLevelPath, someLevelData).shouldFail(done);
        });

        it('should be editable by admin', done => {
          singpath.admins.bobUid = true;
          singpath.admins.aliceUid = false;
          suite.with(seed).as('bobUid').update('/singpath', {
            'paths/somePathId/owner': {
              publicId: 'bob',
              displayName: 'Bob',
              gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
            },
            'levels/somePathId/someLevelId/owner': {
              publicId: 'bob',
              displayName: 'Bob',
              gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
            },
            'levels/somePathId/someLevelId/title': 'some other title'
          }).ok(done);
        });

        it('should be editable by owner', done => {
          singpath.admins.aliceUid = false;
          suite.with(seed).as('aliceUid').update('/', {
            'auth/users/aliceUid/displayName': 'Hal',
            'singpath/userProfiles/alice/user/displayName': 'Hal',
            'singpath/paths/somePathId/owner/displayName': 'Hal',
            'singpath/levels/somePathId/someLevelId/owner/displayName': 'Hal',
            'singpath/paths/somePathId/language': 'java',
            'singpath/levels/somePathId/someLevelId/language': 'java',
            'singpath/levels/somePathId/someLevelId/title': 'some other title'
          }).ok(done);
        });

        it('should not be editable by anybody else', done => {
          suite.with(seed).as('someoneUid').update(someLevelPath, {title: 'some other title'}).shouldFail(done);
        });

        it('should keep problems and levels in sync', done => {
          suite.with(seed).as('aliceUid').update('/', {
            'singpath/levels/somePathId/someLevelId/language': 'java'
          }).shouldFail(done);
        });

        it('should be deletable by admin', done => {
          singpath.admins.bobUid = true;
          suite.with(seed).as('bobUid').update('singpath/', {
            'levels/somePathId/someLevelId': null,
            'problems/somePathId/someLevelId': null,
            'queuedSolutions/somePathId/someLevelId': null
          }).ok(done);
        });

        it('should be deletable by owner', done => {
          suite.with(seed).as('aliceUid').update('singpath/', {
            'levels/somePathId/someLevelId': null,
            'problems/somePathId/someLevelId': null,
            'queuedSolutions/somePathId/someLevelId': null
          }).ok(done);
        });

        it('should not be deletable by anybody else', done => {
          suite.with(seed).as('someoneUid').remove(someLevelPath).shouldFail(done);
        });

        it('should be deletable while some of its problem exists', done => {
          singpath.admins.bobUid = true;
          suite.with(seed).as('bobUid').update('singpath/', {
            'levels/somePathId/someLevelId': null,
            'queuedSolutions/somePathId/someLevelId': null
          }).shouldFail(done);
        });

        it('should be deletable while some of its solutions exists', done => {
          singpath.admins.bobUid = true;
          suite.with(seed).as('bobUid').update('singpath/', {
            'levels/somePathId/someLevelId': null,
            'problems/somePathId/someLevelId': null
          }).shouldFail(done);
        });

      });

    });
  });

  describe('problems', () => {
    const problemsPath = 'singpath/problems';

    it('should be researchable', done => {
      suite.with(seed).get(problemsPath).ok(done);
    });

    describe('$pathId', () => {

      describe('$levelId', () => {

        describe('$problemId', () => {
          const someProblemPath = problemsPath + '/somePathId/someLevelId/someProblemId';
          const writing = () => singpath.problems.somePathId.someLevelId.someProblemId = null;
          let someProblemData;

          beforeEach(() => {
            someProblemData = singpath.problems.somePathId.someLevelId.someProblemId;
          });

          it('should be writable by admin', done => {
            writing();
            suite.with(seed).as('bobUid').set(someProblemPath, someProblemData).ok(done);
          });

          it('should be writable by owner', done => {
            writing();
            suite.with(seed).as('aliceUid').set(someProblemPath, someProblemData).ok(done);
          });

          it('should not be writable by anybody else', done => {
            writing();
            suite.with(seed).as('someoneUid').set(someProblemPath, someProblemData).shouldFail(done);
          });

          it('should be editable by admin', done => {
            singpath.admins.bobUid = true;
            singpath.admins.aliceUid = false;
            suite.with(seed).as('bobUid').update('/singpath', {
              'paths/somePathId/owner': {
                publicId: 'bob',
                displayName: 'Bob',
                gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
              },
              'levels/somePathId/someLevelId/owner': {
                publicId: 'bob',
                displayName: 'Bob',
                gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
              },
              'problems/somePathId/someLevelId/someProblemId/owner': {
                publicId: 'bob',
                displayName: 'Bob',
                gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d'
              },
              'problems/somePathId/someLevelId/someProblemId/title': 'some other title'
            }).ok(done);
          });

          it('should be editable by owner', done => {
            singpath.admins.aliceUid = false;
            suite.with(seed).as('aliceUid').update('/', {
              'auth/users/aliceUid/displayName': 'Hal',
              'singpath/userProfiles/alice/user/displayName': 'Hal',
              'singpath/paths/somePathId/owner/displayName': 'Hal',
              'singpath/levels/somePathId/someLevelId/owner/displayName': 'Hal',
              'singpath/problems/somePathId/someLevelId/someProblemId/owner/displayName': 'Hal',
              'singpath/paths/somePathId/language': 'java',
              'singpath/levels/somePathId/someLevelId/language': 'java',
              'singpath/problems/somePathId/someLevelId/someProblemId/language': 'java',
              'singpath/problems/somePathId/someLevelId/someProblemId/title': 'some other title'
            }).ok(done);
          });

          it('should not be editable by anybody else', done => {
            suite.with(seed).as('someoneUid').update(someProblemPath, {title: 'some other title'}).shouldFail(done);
          });

          it('should keep problems and levels in sync', done => {
            suite.with(seed).as('aliceUid').update(someProblemPath, {language: 'java'}).shouldFail(done);
          });

          it('should be deletable by admin', done => {
            singpath.admins.bobUid = true;
            suite.with(seed).as('bobUid').update('singpath/', {
              'problems/somePathId/someLevelId/someProblemId': null,
              'queuedSolutions/somePathId/someLevelId/someProblemId': null
            }).ok(done);
          });

          it('should be deletable by owner', done => {
            suite.with(seed).as('aliceUid').update('singpath/', {
              'problems/somePathId/someLevelId/someProblemId': null,
              'queuedSolutions/somePathId/someLevelId/someProblemId': null
            }).ok(done);
          });

          it('should not be deletable by anybody else', done => {
            suite.with(seed).as('someoneUid').remove(someProblemPath).shouldFail(done);
          });
        });

      });

    });
  });

  describe('queuedSolutions', () => {

    describe('$path', () => {

      describe('$levelId', () => {

        describe('$problemId', () => {

          describe('$publicId', () => {

            describe('$queueId', () => {
              const userUid = 'aliceUid';
              const someWorker = {
                uid: 'someWorker',
                data: {
                  isWorker: true,
                  queue: 'default'
                }
              };
              const someSolutionPath = 'singpath/queuedSolutions/somePathId/someLevelId/someProblemId/alice/default';

              it('should not be deletable', done => {
                // make sure singpath.queuedSolutions.somePathId.someLevelId.someProblemId it's empty
                // (so that it tests the correct rules).
                singpath.queuedSolutions.somePathId.someLevelId.someProblemId.bob = true;
                suite.with(seed).as(userUid).remove(someSolutionPath).shouldFail(done);
              });

              it('should let owner start a solution', done => {
                startingSolution();
                suite.with(seed).as(userUid).update(someSolutionPath, {
                  meta: startedSolution.meta,
                  payload: null,
                  results: null
                }).ok(done);
              });

              it('should let owner submit a solution', done => {
                submittingSolution();
                suite.with(seed).as(userUid).update('', {
                  [`${someSolutionPath}/meta/endedAt`]: submittedSolution.meta.endedAt,
                  [`${someSolutionPath}/meta/taskId`]: submittedSolution.meta.taskId,
                  [`${someSolutionPath}/payload`]: submittedSolution.payload,
                  [`singpath/queues/default/tasks/${submittedSolution.meta.taskId}`]: pushedTask
                }).ok(done);
              });

              it('should not let owner submit a solution without a task', done => {
                submittingSolution();
                suite.with(seed).as(userUid).update('', {
                  [`${someSolutionPath}/meta/endedAt`]: submittedSolution.meta.endedAt,
                  [`${someSolutionPath}/meta/taskId`]: submittedSolution.meta.taskId,
                  [`${someSolutionPath}/payload`]: submittedSolution.payload
                }).shouldFail(done);
              });

              it('should let the worker submit a results', done => {
                verifyingSolution();
                suite.with(seed).as(someWorker.uid, someWorker.data).update('', {
                  [`${someSolutionPath}/meta/solved`]: verifiedSolution.meta.solved,
                  [`${someSolutionPath}/meta/verified`]: verifiedSolution.meta.verified,
                  [`${someSolutionPath}/results/someTaskId`]: verifiedSolution.results.someTaskId,
                  [`singpath/queues/default/tasks/someTaskId`]: consumedTask
                }).ok(done);
              });

              it('should let the worker submit a solving results', done => {
                solvingSolution();
                suite.with(seed).as(someWorker.uid, someWorker.data).update('', {
                  [`${someSolutionPath}/meta/solved`]: solvedSolution.meta.solved,
                  [`${someSolutionPath}/meta/verified`]: solvedSolution.meta.verified,
                  [`${someSolutionPath}/results/someTaskId`]: solvedSolution.results.someTaskId,
                  [`singpath/queues/default/tasks/someTaskId`]: consumedTask
                }).ok(done);
              });

              it('should not let owner submit a solving results', done => {
                solvingSolution();
                suite.with(seed).as(userUid).update('', {
                  [`${someSolutionPath}/meta/solved`]: solvedSolution.meta.solved,
                  [`${someSolutionPath}/meta/verified`]: solvedSolution.meta.verified,
                  [`${someSolutionPath}/results/someTaskId`]: solvedSolution.results.someTaskId,
                  [`singpath/queues/default/tasks/someTaskId`]: consumedTask
                }).shouldFail(done);
              });

              it('should let owner update history', done => {
                updatingSolutionHistory();
                suite.with(seed).as(userUid).set(
                  [someSolutionPath, 'meta/history', startedAt],
                  duration
                ).ok(done);
              });

              it('should allow user to reset it', done => {
                suite.with(seed).as(userUid).update(someSolutionPath, {
                  'meta/startedAt': Firebase.ServerValue.TIMESTAMP,
                  'meta/endedAt': null,
                  'meta/solved': false,
                  'meta/verified': false,
                  'meta/taskId': null,
                  'payload': null,
                  'results': null
                }).ok(done);
              });

              it('should not allow user to reset it before solving it (1/4)', done => {
                submittingSolution();
                suite.with(seed).as(userUid).update(someSolutionPath, {
                  'meta/startedAt': Firebase.ServerValue.TIMESTAMP,
                  'meta/endedAt': null,
                  'meta/solved': false,
                  'meta/verified': false,
                  'meta/taskId': null,
                  'payload': null,
                  'results': null
                }).shouldFail(done);
              });

              it('should not allow user to reset it before solving it (2/4)', done => {
                verifyingSolution();
                suite.with(seed).as(userUid).update(someSolutionPath, {
                  'meta/startedAt': Firebase.ServerValue.TIMESTAMP,
                  'meta/endedAt': null,
                  'meta/solved': false,
                  'meta/verified': false,
                  'meta/taskId': null,
                  'payload': null,
                  'results': null
                }).shouldFail(done);
              });

              it('should not allow user to reset it before solving it (3/4)', done => {
                solvingSolution();
                suite.with(seed).as(userUid).update(someSolutionPath, {
                  'meta/startedAt': Firebase.ServerValue.TIMESTAMP,
                  'meta/endedAt': null,
                  'meta/solved': false,
                  'meta/verified': false,
                  'meta/taskId': null,
                  'payload': null,
                  'results': null
                }).shouldFail(done);
              });

              it('should not allow user to reset it before solving it (4/4)', done => {
                updatingSolutionHistory();
                suite.with(seed).as(userUid).update(someSolutionPath, {
                  'meta/startedAt': Firebase.ServerValue.TIMESTAMP,
                  'meta/endedAt': null,
                  'meta/solved': false,
                  'meta/verified': false,
                  'meta/taskId': null,
                  'payload': null,
                  'results': null
                }).shouldFail(done);
              });

              describe('meta', () => {

                it('should be readable by owner', done => {
                  suite.with(seed).as(userUid).get([someSolutionPath, 'meta']).ok(done);
                });

                it('should not be readable by anybody else', done => {
                  suite.with(seed).as('someoneUid').get([someSolutionPath, 'meta']).shouldFail(done);
                });

              });

              describe('payload', () => {

                it('should be readable by owner while solving the problem', done => {
                  verifyingSolution();
                  suite.with(seed).as(userUid).get([someSolutionPath, 'payload']).ok(done);
                });

                it('should not be readable by owner when solved', done => {
                  suite.with(seed).as(userUid).get([someSolutionPath, 'payload']).shouldFail(done);
                });

                it('should not be readable by anybody else', done => {
                  verifyingSolution();
                  suite.with(seed).as('someoneUid').get([someSolutionPath, 'payload']).shouldFail(done);
                });

              });

              describe('results', () => {

                it('should be readable by owner', done => {
                  suite.with(seed).as(userUid).get([someSolutionPath, 'results']).ok(done);
                });

                it('should not be readable by anybody else', done => {
                  suite.with(seed).as('someoneUid').get([someSolutionPath, 'results']).shouldFail(done);
                });

              });

            });

          });

        });

      });

    });
  });

  describe('queues', () => {

    describe('$queueId', () => {
      const someWorker = {
        uid: 'someWorker',
        data: {
          isWorker: true,
          queue: 'default'
        }
      };

      describe('workers', () => {
        const workersPath = 'singpath/queues/default/workers';

        it('should should be readable', done => {
          suite.with(seed).get(workersPath).ok(done);
        });

        describe('$workerId', () => {
          const someWorkerPath = [workersPath, someWorker.uid];
          const starting = () => singpath.queues.default.workers[someWorker.uid] = null;

          it('should be writable by owner', done => {
            starting();
            suite.with(seed).as(someWorker.uid, someWorker.data).set(someWorkerPath, {
              startedAt: Firebase.ServerValue.TIMESTAMP,
              presence: Firebase.ServerValue.TIMESTAMP
            }).ok(done);
          });

          it('should not be writable by other worker', done => {
            starting();
            suite.with(seed).as('someOtherWorker', someWorker.data).set(someWorkerPath, {
              startedAt: Firebase.ServerValue.TIMESTAMP,
              presence: Firebase.ServerValue.TIMESTAMP
            }).shouldFail(done);
          });

          it('should be deletable by owner', done => {
            suite.with(seed).as(someWorker.uid, someWorker.data).remove(someWorkerPath).ok(done);
          });

          it('should be deletable by other worker (to remove crashed worker)', done => {
            suite.with(seed).as('otherWorker', someWorker.data).remove(someWorkerPath).ok(done);
          });

          describe('startedAt', () => {

            it('should not be editable', done => {
              suite.with(seed).as(someWorker.uid, someWorker.data).set(
                someWorkerPath.concat(['startedAt']),
                Firebase.ServerValue.TIMESTAMP
              ).shouldFail(done);
            });

          });

          describe('presence', () => {

            it('should be writable by owner', done => {
              suite.with(seed).as(someWorker.uid, someWorker.data).set(
                someWorkerPath.concat(['presence']),
                Firebase.ServerValue.TIMESTAMP
              ).ok(done);
            });

            it('should not be writable by other workers', done => {
              suite.with(seed).as('otherWorker', someWorker.data).set(
                someWorkerPath.concat(['presence']),
                Firebase.ServerValue.TIMESTAMP
              ).shouldFail(done);
            });

          });

        });

      });

      describe('tasks', () => {
        const taskPath = 'singpath/queues/default/tasks';

        it('should should be readable by workers', done => {
          suite.with(seed).as(someWorker.uid, someWorker.data).get(taskPath).ok(done);
        });

        it('should not be readable by users', done => {
          suite.with(seed).as('someoneUid').get(taskPath).shouldFail(done);
        });

        describe('$taskId', () => {
          const someTaskPath = [taskPath, 'someTaskId'];

          it('should be readable by owner', done => {
            suite.with(seed).as('aliceUid').get(someTaskPath).ok(done);
          });

          it('should allow workers to claim a task', done => {
            claimingTask();
            suite.with(seed).as(someWorker.uid, someWorker.data).set(
              someTaskPath,
              startedTask
            ).ok(done);
          });

          it('should allow workers to un-claim its own task', done => {
            unclaimingTask();
            suite.with(seed).as(someWorker.uid, someWorker.data).update(someTaskPath, {
              'started': false,
              'startedAt': null,
              'worker': null
            }).ok(done);
          });

          it('should allow workers to un-claim its own task and record its attempt', done => {
            unclaimingTask();
            suite.with(seed).as(someWorker.uid, someWorker.data).update(someTaskPath, {
              'started': false,
              'startedAt': null,
              'worker': null,
              [`tries/${someWorker.uid}`]: Firebase.ServerValue.TIMESTAMP
            }).ok(done);
          });

          it('should allow any worker to un-claim some other worker task', done => {
            unclaimingTask();
            suite.with(seed).as('someOtherWorker', someWorker.data).update(someTaskPath, {
              'started': false,
              'startedAt': null,
              'worker': null
            }).ok(done);
          });

          it('should not allow any worker to un-claim a recently claimed task', done => {
            claimingTask();
            suite.with(
              seed
            ).as(someWorker.uid, someWorker.data).set(
              someTaskPath,
              startedTask
            ).as('someOtherWorker', someWorker.data).update(someTaskPath, {
              'started': false,
              'startedAt': null,
              'worker': null
            }).shouldFail(done);
          });

          it('should allow worker to save results with task', done => {
            const pullTaskPath = 'singpath/queues/default/tasks/somePullingTaskId';
            const results = singpath.queues.default.tasks.somePullingTaskId.results;

            singpath.queues.default.tasks.somePullingTaskId.completed = false;
            singpath.queues.default.tasks.somePullingTaskId.completedAt = null;
            singpath.queues.default.tasks.somePullingTaskId.results = null;

            suite.with(seed).as(someWorker.uid, someWorker.data).update(pullTaskPath, {
              completed: true,
              completedAt: Firebase.ServerValue.TIMESTAMP,
              results: results
            }).ok(done);
          });

          it('should allow worker to save results with task if the ref\'ed solution is taskid has changed', done => {
            const pushTaskPath = 'singpath/queues/default/tasks/someTaskId';

            solvingSolution();
            singpath.queuedSolutions.somePathId.someLevelId.someProblemId.alice.default.meta.taskId = 'someOtherTaskId';

            suite.with(seed).as(someWorker.uid, someWorker.data).update(pushTaskPath, {
              completed: true,
              completedAt: Firebase.ServerValue.TIMESTAMP,
              results: solvedSolution.results.someTaskId
            }).ok(done);
          });

          describe('consumed', () => {
            const pullTaskPath = 'singpath/queues/default/tasks/somePullingTaskId/consumed';

            it('should be writable by client', done => {
              suite.with(seed).as(
                'verifier-client', null).set(
                pullTaskPath, true
              ).ok(done);
            });

          });

        });

      });

    });

  });
});
