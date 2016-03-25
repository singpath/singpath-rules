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
describe('auth', function() {
  let suite;
  let userData;

  this.timeout(5000);

  beforeEach(() => {
    suite = new fb.testSuite({
      firebaseId: process.env.SINGPATH_RULES_E2E_FIREBASE_ID,
      firebaseSecret: process.env.SINGPATH_RULES_E2E_FIREBASE_SECRET,
      defaultAuthData: DEFAULT_AUTH_DATA
    });

    userData = {
      id: 'bob',
      publicId: 'bob-public-id',
      fullName: 'Bob Smith',
      displayName: 'Bob',
      email: 'bob@example.com',
      gravatar: 'http://www.gravatar.com/avatar/4b9bb80620f03eb3719e0a061c14283d',
      createdAt: Firebase.ServerValue.TIMESTAMP
    };
  });

  afterEach(() => {
    suite.restore();
  });

  describe('publicIds', () => {
    const path = 'auth/publicIds';

    it('should not be searcheable', done => {
      suite.with({}).as('bob').get(path).shouldFail(done);
    });

    describe('children', () => {
      const bobClaim = path + '/bob';
      let seed;

      beforeEach(() => {
        seed = {
          auth: {
            usedPublicIds: {
              bob: true
            },
            users: {
              'custome:bob': {
                publicId: 'bob'
              }
            }
          }
        };
      });

      it('should not be readeable', done => {
        suite.with({}).as('bob').get(bobClaim).shouldFail(done);
      });

      it('should be writable', done => {
        suite.with(seed).as('custome:bob').set(bobClaim, 'custome:bob').ok(done);
      });

      it('should only be writable by the user claiming it', done => {
        suite.with(seed).as('aliceId').set(bobClaim, 'custome:bob').shouldFail(done);
      });

      it('should not be deleteable', done => {
        suite.with(seed).as('custome:bob').remove(bobClaim).shouldFail(done);
      });

      it('should not be editable', done => {
        seed.auth.publicIds = {bob: 'custome:bob'};
        seed.auth.users['custome:bob'].publicId = null;
        seed.auth.users.aliceId = {publicId: 'bob'};
        suite.with(seed).as('aliceId').set(bobClaim, 'aliceId').shouldFail(done);
      });

      it('should only be writable if the public id is registered as used', done => {
        seed.auth.usedPublicIds.bob = false;
        suite.with(seed).as('custome:bob').set(bobClaim, 'custome:bob').shouldFail(done);
      });

      it('should only be writable if the user is using the publicId', done => {
        seed.auth.users['custome:bob'].publicId = 'some-other-id';
        suite.with(seed).as('custome:bob').set(bobClaim, 'custome:bob').shouldFail(done);
      });

    });

  });

  describe('usedPublicIds', () => {
    const path = 'auth/usedPublicIds';

    it('should be searcheable', done => {
      suite.with({}).as('bob').get(path).ok(done);
    });

    describe('children', () => {

      it('should reflect a public id is claimed', done => {
        suite.with({
          auth: {
            publicIds: {
              bob: 'bob-id'
            }
          }
        }).as('some-one').set(path + '/bob', true).ok(done);
      });

      it('should reflect a public id is not claimed', done => {
        suite.with({
          auth: {
            publicIds: {
              alice: 'alice-id'
            }
          }
        }).as('some-one').set(path + '/bob', false).ok(done);
      });

    });

  });

  describe('users', () => {
    const users = 'auth/users';

    it('should not be searcheable', done => {
      suite.with({}).as('bob').get(users).shouldFail(done);
    });

    describe('$userId', () => {
      const bob = users + '/bob';
      let seed;

      beforeEach(() => {
        seed = {
          auth: {
            publicIds: {
              'bob-public-id': 'bob'
            },
            usedPublicIds: {
              'bob-public-id': true
            }
          }
        };
      });

      it('should be readeable by the user', done => {
        suite.with({}).as('bob').get(bob).ok(done);
      });

      it('should not be readeable by other user', done => {
        suite.with({}).as('alice').get(bob).shouldFail(done);
      });

      it('should be writable by user', done => {
        suite.with(seed).as('bob').set(bob, userData).ok(done);
      });

      it('should be writable by user without publicId', done => {
        userData.publicId = null;
        suite.with(seed).as('bob').set(bob, userData).ok(done);
      });

      it('should only be writable by user', done => {
        suite.with(seed).as('alice').set(bob, userData).shouldFail(done);
      });

      it('should only be writable if the public id is claimed', done => {
        seed.auth.publicIds['bob-public-id'] = null;
        suite.with(seed).as('bob').set(bob, userData).shouldFail(done);
      });

      it('should only be writable if the public id is claimed by the user', done => {
        seed.auth.publicIds['bob-public-id'] = 'alice';
        suite.with(seed).as('bob').set(bob, userData).shouldFail(done);
      });

      it('should only be writable if the public id is claimed', done => {
        seed.auth.publicIds['bob-public-id'] = null;
        suite.with(seed).as('bob').set(bob, userData).shouldFail(done);
      });

      it('should only be writable if the public id is registered as claimed', done => {
        seed.auth.usedPublicIds['bob-public-id'] = false;
        suite.with(seed).as('bob').set(bob, userData).shouldFail(done);
      });

      it('should be writable with birthday', done => {
        userData.yearOfBirth = 2000;

        suite.with(seed).as('bob').set(bob, userData).ok(done);
      });

      it('should be writable with country', done => {
        userData.country = {
          name: 'Singapore',
          code: 'SG'
        };

        suite.with(seed).as('bob').set(bob, userData).ok(done);
      });

      it('should be writable with school', done => {
        userData.school = {
          'iconUrl': '/assets/crests/NUS_HS.jpeg',
          'id': 'NUS High School',
          'name': 'NUS High School',
          'type': 'Junior College'
        };

        suite.with(seed).as('bob').set(bob, userData).ok(done);
      });

      it('should be writable with school (no icon)', done => {
        userData.school = {
          'id': 'NUS High School',
          'name': 'NUS High School',
          'type': 'Junior College'
        };

        suite.with(seed).as('bob').set(bob, userData).ok(done);
      });

      it('should allow secret key to be added', (done) => {
        seed.auth.users = {bob: userData};
        suite.with(seed).as('bob', null, true).update(bob, {
          secretKey: 's'.repeat(16),
          secretKeyValidUntil: Date.now() + 3600
        }).ok(done);
      });

    });

  });

  it('should allow users to register', done => {
    suite.with({}).as('bob').update('auth', {
      'publicIds/bob-public-id': 'bob',
      'usedPublicIds/bob-public-id': true,
      'users/bob': userData
    }).ok(done);
  });

});
