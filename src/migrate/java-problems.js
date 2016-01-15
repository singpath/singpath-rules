'use strict';

const rest = require('../rest');
const util = require('util');

const version = 2;
const noop = () => undefined;

const warpper = `import org.junit.Test;
import static org.junit.Assert.*;
import junit.framework.*;
import com.singpath.SolutionRunner;

public class SingPathTest extends SolutionRunner {

    @Test
    public void testCapitalize() throws Exception {
%s
    }
}`;


const Upgrader = exports.Upgrader = class Upgrader {

  constructor(ref, token, opts) {
    const root = ref.root();

    this.baseUri = root.toString();
    this.client = rest.client(this.baseUri, token);

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
    return this.migratePaths().then(
      () => this.migrateTaskTests()
    ).then(
      () => version
    );
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

  pathIds() {
    return this.client.get('singpath/paths').then(paths => {
      if (paths == null) {
        return [];
      }

      return Object.keys(paths).filter(id => paths[id].language === 'java');
    });
  }

  migrateLevels(pathId) {
    this.logger.info('migrating solutions at /singpath/solutions/%s ...', pathId);

    return this.levelIds(pathId).then(ids => {
      this.logger.debug('Levels to handle (path id: %s): %j', pathId, ids);

      return ids.reduce((chain, levelId) => {
        return chain.then(() => this.migrateProblemTests(pathId, levelId));
      }, Promise.resolve());
    });
  }

  levelIds(pathId) {
    return this.client.get(`singpath/levels/${pathId}`, true).then(ids => {
      return ids !== null ? Object.keys(ids) : [];
    });
  }

  migrateProblemTests(pathId, levelId) {
    this.logger.info('migrating solutions at /singpath/solutions/%s/%s ...', pathId, levelId);

    return this.problems(pathId, levelId).then(problems => {
      const ids = Object.keys(problems);

      this.logger.debug('Problems to handle (path id: %s, level id: %s): %j', pathId, levelId, ids);

      return ids.reduce((chain, problemId) => {
        return chain.then(() => {
          const oldTests = problems[problemId].tests;
          const newTests = this.convertTests(oldTests);

          return this.saveProblemTests(pathId, levelId, problemId, newTests).then(() => newTests);
        }).then(
          tests => this.migrateSolutionsTests(pathId, levelId, problemId, tests)
        );
      }, Promise.resolve());
    });
  }

  problems(pathId, levelId) {
    const path = `singpath/problems/${pathId}/${levelId}`;

    return this.client.get(path).then(problems => problems || {});
  }

  saveProblemTests(pathId, levelId, problemId, tests) {
    const path = `singpath/problems/${pathId}/${levelId}/${problemId}/tests`;

    return this.client.set(path, tests, this.queryLog);
  }

  convertTests(test) {
    const padding = '      ';
    const paddedTests = test.split('\n').map( l => padding + l).join('\n');

    return util.format(warpper, paddedTests);
  }

  migrateSolutionsTests(pathId, levelId, problemId, newTests) {
    this.logger.info('migrating solutions tests at /singpath/solutions/%s/%s/%s ...', pathId, levelId, problemId);

    return this.solutions(pathId, levelId, problemId).then(solutions => {
      const publicIds = Object.keys(solutions);

      this.logger.debug(
        'Solutions to handle (path id: %s, level id: %s, problem id: %s): %j',
        pathId, levelId, problemId, publicIds
      );

      return publicIds.reduce((chain, publicId) => {
        if (
          !solutions[publicId] ||
          !solutions[publicId].default ||
          !solutions[publicId].default.payload ||
          !solutions[publicId].default.payload.tests
        ) {
          this.logger.debug(
            'Solution has no test (path id: %s, level id: %s, problem id: %s, public id: %s)',
            pathId, levelId, problemId, publicId
          );
          return;
        }

        return this.saveSolutionTests(pathId, levelId, problemId, publicId, newTests);
      }, Promise.resolve());
    });
  }

  solutions(pathId, levelId, problemId) {
    const path = `singpath/queuedSolutions/${pathId}/${levelId}/${problemId}`;

    return this.client.get(path).then(solutions => solutions || {});
  }

  saveSolutionTests(pathId, levelId, problemId, publicId, tests) {
    const path = `singpath/queuedSolutions/${pathId}/${levelId}/${problemId}/${publicId}/default/payload/tests`;

    return this.client.set(path, tests, this.queryLog);
  }

  migrateTaskTests() {
    this.logger.info('migrating tasks...');

    return this.tasks().then(tasks => {
      const ids = Object.keys(tasks);

      this.logger.debug('Tasks to handle: %j', ids);

      return ids.filter(id => {
        return tasks[id].payload.language === 'java';
      }).reduce((chain, taskId) => {
        const oldTests = tasks[taskId].payload.tests;
        const newTests = this.convertTests(oldTests);

        return this.saveTaskTests(taskId, newTests);
      }, Promise.resolve());
    });
  }

  tasks() {
    const path = 'singpath/queues/default/tasks';
    const opts = {
      orderBy: '"completed"',
      equalTo: false
    };

    return this.client.get(path, opts).then(tasks => tasks || {});
  }

  saveTaskTests(taskId, tests) {
    const path = `singpath/queues/default/tasks/${taskId}/payload/tests`;

    return this.client.set(path, tests, this.queryLog);
  }
};


exports.version = version;
exports.description = 'Convert Java problems to new verifier';

exports.upgrade = (src, token, opts) => new Upgrader(src, token, opts).start();
exports.revert = () => Promise.resolve(version - 1);
