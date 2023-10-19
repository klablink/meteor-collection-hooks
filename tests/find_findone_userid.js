/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { CollectionHooks } from 'meteor/matb33:collection-hooks'
import { Mocha } from 'meteor/meteortesting:mocha-core'

const collection = new Mongo.Collection('test_collection_for_find_findone_userid')

let beforeFindUserId
let afterFindUserId
let beforeFindOneUserId
let afterFindOneUserId
let beforeFindWithinPublish
let afterFindWithinPublish
let beforeFindOneWithinPublish
let afterFindOneWithinPublish

// Don't declare hooks in publish method, as it is problematic
// eslint-disable-next-line array-callback-return
collection.before.find(function (userId, selector, options) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    beforeFindUserId = userId

    if (CollectionHooks.isWithinPublish) {
      beforeFindWithinPublish = CollectionHooks.isWithinPublish()
    }
  }
})

// eslint-disable-next-line array-callback-return
collection.after.find(function (userId, selector, options, result) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    afterFindUserId = userId

    if (CollectionHooks.isWithinPublish) {
      afterFindWithinPublish = CollectionHooks.isWithinPublish()
    }
  }
})

collection.before[Meteor.isFibersDisabled ? 'findOneAsync' : 'findOne'](function (userId, selector, options) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    beforeFindOneUserId = userId

    if (CollectionHooks.isWithinPublish) {
      beforeFindOneWithinPublish = CollectionHooks.isWithinPublish()
    }
  }
})

collection.after[Meteor.isFibersDisabled ? 'findOneAsync' : 'findOne'](function (userId, selector, options, result) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    afterFindOneUserId = userId

    if (CollectionHooks.isWithinPublish) {
      afterFindOneWithinPublish = CollectionHooks.isWithinPublish()
    }
  }
})

if (Meteor.isServer) {
  let serverTestsAdded = false
  let publishContext = null

  describe('find findone userid', function () {
    it('general - isWithinPublish is false outside of publish function', function () {
      assert.equal(CollectionHooks.isWithinPublish(), false)
    })
  })

  Meteor.publish('test_publish_for_find_findone_userid', async function () {
    // Reset test values on each connection
    publishContext = null

    beforeFindUserId = null
    afterFindUserId = null
    beforeFindOneUserId = null
    afterFindOneUserId = null

    beforeFindWithinPublish = false
    afterFindWithinPublish = false
    beforeFindOneWithinPublish = false
    afterFindOneWithinPublish = false

    // Check publish context
    publishContext = this

    // Trigger hooks
    collection.find({}, { test: 1 })
    await collection.findOneAsync({}, { test: 1 })

    if (!serverTestsAdded) {
      const Test = Mocha.Test
      const Suite = Mocha.Suite
      serverTestsAdded = true

      // Our monkey-patch of Meteor.publish should preserve the value of 'this'.
      const testRunner = new Mocha()
      const suite = Suite.create(testRunner.suite, 'find findone userid')
      suite.addTest(new Test('general - this (context) preserved in publish functions', function () {
        assert.isTrue(publishContext && !!publishContext.userId)
      }))

      suite.addTest(new Test('find - userId available to before find hook when within publish context', function () {
        assert.notEqual(beforeFindUserId, null)
        assert.equal(beforeFindWithinPublish, true)
      }))

      suite.addTest(new Test('find - userId available to after find hook when within publish context', function () {
        assert.notEqual(afterFindUserId, null)
        assert.equal(afterFindWithinPublish, true)
      }))

      suite.addTest(new Test('findone - userId available to before findOne hook when within publish context', function () {
        assert.notEqual(beforeFindOneUserId, null)
        assert.equal(beforeFindOneWithinPublish, true)
      }))

      suite.addTest(new Test('findone - userId available to after findOne hook when within publish context', function () {
        assert.notEqual(afterFindOneUserId, null)
        assert.equal(afterFindOneWithinPublish, true)
      }))

      testRunner.run()
    }
  })
}

if (Meteor.isClient) {
  const cleanup = () => {
    beforeFindUserId = null
    afterFindUserId = null
    beforeFindOneUserId = null
    afterFindOneUserId = null
  }

  // Run client tests.
  // TODO: Somehow, it / addAsync doesn't work inside InsecureLogin.ready().
  // Hence, we add these tests wrapped synchronously with a login hook.
  // Ideally, this function should wrap the test functions.

  describe('find findone userid', function () {
    before(async function () {
      await InsecureLogin.ready()
      Meteor.subscribe('test_publish_for_find_findone_userid')
    })

    beforeEach(function () {
      cleanup()
    })

    it('find - userId available to before find hook', function () {
      collection.find({}, { test: 1 })
      assert.notEqual(beforeFindUserId, null)
    })

    it('find - userId available to after find hook', function () {
      collection.find({}, { test: 1 })
      assert.notEqual(afterFindUserId, null)
    })

    it('findone - userId available to before findOne hook', async function () {
      await collection.findOneAsync({}, { test: 1 })
      assert.notEqual(beforeFindOneUserId, null)
    })

    it('findone - userId available to after findOne hook', async function () {
      await collection.findOneAsync({}, { test: 1 })
      assert.notEqual(afterFindOneUserId, null)
    })
  })
}
