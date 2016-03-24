'use strict';

const Firebase = require('firebase');
const restFirebase = require('rest-firebase');

const version = 1;
const shallow = true;
const noop = () => undefined;


const Upgrader = exports.Upgrader = class Upgrader {

  constructor(ref, token, opts) {
    const root = ref.root();
    const baseUri = root.toString();
    const rest = restFirebase.factory(baseUri);

    this.baseUri = baseUri;
    this.client = paths => rest({paths, token});

    this.dest = root.child('singpath');
    this.taskDest = root.child('singpath/queues/default/tasks');

    opts = opts || {};
    this.queryLog = opts.queryLog || noop;
    this.logger = opts.logger || {
      debug: noop,
      info: noop,
      error: noop
    };

    this.logger.debug('Upgrader targeting "%s"', this.baseUri);
  }

  start() {
    return this.migratePaths().then(() => version);
  }

  solution(payload, resolution) {
    const solution = {
      meta: {
        startedAt: resolution.startedAt,
        endedAt: resolution.endedAt || null,
        verified: resolution.output !== undefined,
        solved: resolution.output && resolution.output.solved || false
      },
      payload: payload
    };

    if (solution.meta.verified) {
      solution.meta.taskId = 'migrate-version-1';
      solution.results = {
        'migrate-version-1': resolution.output
      };
    }

    if (solution.meta.solved) {
      solution.meta.history = {
        [solution.meta.startedAt]: solution.meta.endedAt - solution.meta.startedAt
      };
    }

    return Promise.resolve(solution);
  }

  task(pathId, levelId, problemId, publicId, solution) {
    const ref = this.client(`auth/publicIds/${publicId}`);

    return ref.get().then(uid => {
      return {
        owner: uid,
        payload: solution.payload,
        createdAt: Firebase.ServerValue.TIMESTAMP,
        started: false,
        completed: false,
        consumed: false,
        solutionRef: `singpath/queuedSolutions/${pathId}/${levelId}/${problemId}/${publicId}/default`
      };
    });
  }

  solutionRef(solution) {
    const ref = {
      startedAt: solution.meta.startedAt,
      language: solution.payload.language,
      solved: solution.meta.solved
    };

    if (solution.meta.solved) {
      ref.duration = solution.meta.history[solution.meta.startedAt];
    }

    return ref;
  }

  saveSolution(pathId, levelId, problemId, publicId, solution) {
    this.logger.debug(
      'Saving queued solution at /singpath/queuedSolutions/%s/%s/%s/%s/default',
      pathId, levelId, problemId, publicId
    );

    if (
      !solution ||
      !solution.meta ||
      !solution.payload ||
      !solution.meta.endedAt ||
      !solution.meta.startedAt ||
      solution.meta.verified == null ||
      solution.meta.solved == null
    ) {
      this.logger.debug('Dropping solution; it is missing some attribute');
      return Promise.resolve();
    }

    if (solution.meta.verified) {
      return this.saveVerifiedSolution(pathId, levelId, problemId, publicId, solution);
    } else {
      return this.saveSolutionAndTask(pathId, levelId, problemId, publicId, solution);
    }
  }

  saveVerifiedSolution(pathId, levelId, problemId, publicId, solution) {
    return new Promise((resolve, reject) => {
      const data = {
        [`queuedSolutions/${pathId}/${levelId}/${problemId}/${publicId}/default`]: solution,
        [`userProfiles/${publicId}/queuedSolutions/${pathId}/${levelId}/${problemId}/default`]: this.solutionRef(solution)
      };

      this.dest.update(data, err => {
        const success = err == null;

        if (err) {
          reject(err);
        } else {
          resolve();
        }

        this.queryLog({data, success, baseUri: this.baseUri, path: '/singpath'});
      });
    });
  }

  saveSolutionAndTask(pathId, levelId, problemId, publicId, solution) {
    return this.task(pathId, levelId, problemId, publicId, solution).then(task => {
      const taskId = solution.meta.taskId = this.taskDest.push().key();

      return new Promise((resolve, reject) => {
        const data = {
          [`queuedSolutions/${pathId}/${levelId}/${problemId}/${publicId}/default`]: solution,
          [`userProfiles/${publicId}/queuedSolutions/${pathId}/${levelId}/${problemId}/default`]: this.solutionRef(solution),
          [`queues/default/tasks/${taskId}`]: task
        };

        this.dest.update(data, err => {
          const success = err == null;

          if (err) {
            reject(err);
          } else {
            resolve();
          }

          this.queryLog({data, success, baseUri: this.baseUri, path: '/singpath'});
        });
      });
    });
  }

  migratePaths() {
    this.logger.info('migrating solutions...');

    return this.pathIds().then(ids => {
      this.logger.debug('Paths to handle: %j', ids);

      return ids.reduce((chain, pathId) => {
        return chain.then(() => this.migrateLevels(pathId));
      }, Promise.resolve());
    });
  }

  migrateLevels(pathId) {
    this.logger.info('migrating solutions at /singpath/solutions/%s ...', pathId);

    return this.levelIds(pathId).then(ids => {
      this.logger.debug('Levels to handle (path id: %s): %j', pathId, ids);

      return ids.reduce((chain, levelId) => {
        return chain.then(() => this.migrateProblems(pathId, levelId));
      }, Promise.resolve());
    });
  }

  migrateProblems(pathId, levelId) {
    this.logger.info('migrating solutions at /singpath/solutions/%s/%s ...', pathId, levelId);

    return this.problemIds(pathId, levelId).then(ids => {
      this.logger.debug('Problems to handle (path id: %s, level id: %s): %j', pathId, levelId, ids);

      return ids.reduce((chain, problemId) => {
        return chain.then(() => this.migrateSolutions(pathId, levelId, problemId));
      }, Promise.resolve());
    });
  }

  migrateSolutions(pathId, levelId, problemId) {
    this.logger.info('migrating solutions at /singpath/solutions/%s/%s/%s ...', pathId, levelId, problemId);

    return Promise.all([
      this.solutions(pathId, levelId, problemId),
      this.resolutions(pathId, levelId, problemId)
    ]).then(data => {
      const solutions = data[0] || {};
      const resolutions = data[1] || {};
      const publicIds = Object.keys(solutions);

      this.logger.debug(
        'Solutions to handle (path id: %s, level id: %s, problem id: %s): %j',
        pathId, levelId, problemId, publicIds
      );

      return publicIds.reduce((chain, publicId) => {
        const payload = solutions[publicId];
        const resolution = resolutions[publicId];

        return chain.then(
          () => this.solution(payload, resolution)
        ).then(
          solution => this.saveSolution(pathId, levelId, problemId, publicId, solution)
        );
      }, Promise.resolve());
    });
  }

  pathIds() {
    const ref = this.client('singpath/paths');

    return ref.get({shallow}).then(ids => {
      return ids !== null ? Object.keys(ids) : [];
    });
  }

  levelIds(pathId) {
    const ref = this.client(`singpath/levels/${pathId}`);

    return ref.get({shallow}).then(ids => {
      return ids !== null ? Object.keys(ids) : [];
    });
  }

  problemIds(pathId, levelId) {
    const ref = this.client(`singpath/problems/${pathId}/${levelId}`);

    return ref.get({shallow}).then(ids => {
      return ids !== null ? Object.keys(ids) : [];
    });
  }

  solutions(pathId, levelId, problemId) {
    const ref = this.client(`singpath/solutions/${pathId}/${levelId}/${problemId}`);

    return ref.get().then(solutions => solutions || {});
  }

  resolutions(pathId, levelId, problemId) {
    const ref = this.client(`singpath/resolutions/${pathId}/${levelId}/${problemId}`);

    return ref.get().then(resolutions => resolutions || {});
  }
};

// New version after migration
exports.version = version;
exports.description = 'Convert solutions and resolutions to queuedSolutions';

// Transform the solutions and resolutions into queuedSolutions
// (and optionally tasks).
exports.upgrade = (src, token, opts) => new Upgrader(src, token, opts).start();

// Nothing to do when reverting (maybe deleted queued solutions)
exports.revert = () => Promise.resolve(version - 1);
