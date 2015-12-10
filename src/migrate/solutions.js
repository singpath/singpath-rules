'use strict';

const Firebase = require('firebase');
const rest = require('../rest');

const version = 1;


const Upgrader = exports.Upgrader = class Upgrader {

  constructor(ref, token) {
    const root = ref.root();
    const baseUri = root.toString();

    this.dest = root.child('singpath');
    this.taskDest = root.child('singpath/queues/default/tasks');
    this.client = rest.client(baseUri, token);
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
    return this.client.get(`auth/publicIds/${publicId}`).then(uid => {
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
    if (solution.meta.verified) {
      return this.saveVerifiedSolution(pathId, levelId, problemId, publicId, solution);
    } else {
      return this.saveSolutionAndTask(pathId, levelId, problemId, publicId, solution);
    }
  }

  saveVerifiedSolution(pathId, levelId, problemId, publicId, solution) {
    return new Promise((resolve, reject) => {
      this.dest.update({
        [`queuedSolutions/${pathId}/${levelId}/${problemId}/${publicId}/default`]: solution,
        [`userProfiles/${publicId}/queuedSolutions/${pathId}/${levelId}/${problemId}/default`]: this.solutionRef(solution)
      }, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  saveSolutionAndTask(pathId, levelId, problemId, publicId, solution) {
    return this.task(pathId, levelId, problemId, publicId, solution).then(task => {
      const taskId = solution.meta.taskId = this.taskDest.push();

      return new Promise((resolve, reject) => {
        this.dest.update({
          [`queuedSolutions/${pathId}/${levelId}/${problemId}/${publicId}/default`]: solution,
          [`userProfiles/${publicId}/queuedSolutions/${pathId}/${levelId}/${problemId}/default`]: this.solutionRef(solution),
          [`queues/default/tasks/${taskId}`]: task
        }, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  migratePaths() {
    return this.pathIds().then(ids => {
      return ids.reduce((chain, pathId) => {
        return chain.then(() => this.migrateLevels(pathId));
      }, Promise.resolve());
    });
  }

  migrateLevels(pathId) {
    return this.levelIds(pathId).then(ids => {
      return ids.reduce((chain, levelId) => {
        return chain.then(() => this.migrateProblems(pathId, levelId));
      }, Promise.resolve());
    });
  }

  migrateProblems(pathId, levelId) {
    return this.problemIds(pathId, levelId).then(ids => {
      return ids.reduce((chain, problemId) => {
        return chain.then(() => this.migrateSolutions(pathId, levelId, problemId));
      }, Promise.resolve());
    });
  }

  migrateSolutions(pathId, levelId, problemId) {
    return Promise.all([
      this.solutions(pathId, levelId, problemId),
      this.resolutions(pathId, levelId, problemId)
    ]).then(data => {
      const solutions = data[0] || {};
      const resolutions = data[1] || {};

      return Object.keys(solutions).reduce((chain, publicId) => {
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
    return this.client.get('singpath/paths', true).then(ids => {
      return ids !== null ? Object.keys(ids) : [];
    });
  }

  levelIds(pathId) {
    return this.client.get(`singpath/levels/${pathId}`, true).then(ids => {
      return ids !== null ? Object.keys(ids) : [];
    });
  }

  problemIds(pathId, levelId) {
    return this.client.get(`singpath/problems/${pathId}/${levelId}`, true).then(ids => {
      return ids !== null ? Object.keys(ids) : [];
    });
  }

  solutions(pathId, levelId, problemId) {
    const path = `singpath/solutions/${pathId}/${levelId}/${problemId}`;

    return this.client.get(path).then(solutions => solutions || {});
  }

  resolutions(pathId, levelId, problemId) {
    const path = `singpath/resolutions/${pathId}/${levelId}/${problemId}`;

    return this.client.get(path).then(resolutions => resolutions || {});
  }
};

// New version after migration
exports.version = version;
exports.description = 'Convert solutions and resolutions to queuedSolutions';

// Tranform the solutions and resolutions into queuedSolutions
// (and optionally tasks).
exports.upgrade = (src, token) => new Upgrader(src, token).start();

// Nothing to do when reverting (maybe deleted queued solutions)
exports.revert = () => Promise.resolve(version - 1);