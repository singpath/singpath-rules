# Contribution


The rules are defined in the `./rules/*.bolt` files using
[firebase-bolt](https://github.com/firebase/bolt/blob/v0.5.0/docs/language.md).

The tests are defined in the `./e2e/*.js` files using
[mocha](https://mochajs.org/) and
[firebase-test](https://github.com/singpath/firebase-test). The targeted engine
is node 4.x using the [subset of ES2015](https://nodejs.org/en/docs/es6/) it
supports.


## Setup

[Fork](https://github.com/singpath/firebase-rules#fork-destination-box) and
clone your repository:
```
git clone git@github.com:your-github-id/singpath-rules.git
cd firebase-rules
git remote add upstream https://github.com/singpath/singpath-rules.git
npm install
```

Setup a new Firebase DB for testing and set some environment variables:
```
export SINGPATH_RULES_E2E_FIREBASE_ID=some-firebase-id
export SINGPATH_RULES_E2E_FIREBASE_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```


## Running the e2e tests

```shell
make e2e
```


## Pull request

It's easier to submit patch using feature branch:
```
git pull upstream master
git checkout -b my-feature-branch
...
git push origin my-feature-branch
```

If master becomes a head of your branch, you rebase out of it:
```
git checkout master
git pull upstream master
git branch my-feature-branch
git rebase master -i
git push origin my-feature-branch -f
```

Your pull request should always include fixes to test or new tests.


## Debugging rules

A typical test looks like this:
```js
const fb = require('firebase-test');

// cannot use arrow function or this would be bind to global;
// but we need to set timeout.
describe('something', function() {
  lets suite;

  // the first test need some time to connect to the server
  this.timeout(5000);

  beforeEach(() => {
    // reset suite before each test (includes patching console.warn)
    suite = new fb.testSuite({
      firebaseId: process.env.SINGPATH_RULES_E2E_FIREBASE_ID,
      firebaseSecret: process.env.SINGPATH_RULES_E2E_FIREBASE_SECRET
    });
  });

  afterEach(() => {
	// reset console.warn
  	suite.restore();
  });

  describe('some-attribute', () => {

	it('should be readable', done => {
	  suite.with(
	  	{original: '', state: '', ofDb: ''}
	  ).as(
	  	'someOne'
	  ).get(
	  	'some/path'
	  ).ok(done);
	});

  })
})
```

To print the rules debugging info, you can use the `as` third argument (`debug`):
```js
it('should be readable', done => {
  suite.with(
  	{original: '', state: '', ofDb: ''}
  ).as(
  	'someOne', null, true /* debug argument */
  ).get(
  	'some/path'
  ).ok(done);
});
```

It's quite verbose, you should never commit a test with a debug argument
enabled.

The debug info will be the same than one given in firebase simulator tab,
expect that it works for any type or request (including updates).

