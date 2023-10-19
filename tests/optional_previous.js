/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { CollectionHooks } from 'meteor/matb33:collection-hooks'

describe('optional-previous', function (test) {
  it('optional-previous - update hook should not prefetch previous, via hook option param', function (done) {
    const collection = new Mongo.Collection(null)

    collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier, options) {
      if (doc && doc._id === 'test') {
        assert.equal(!!this.previous, false)
        done()
      }
    }, { fetchPrevious: false })

    collection.insertAsync({ _id: 'test', test: 1 })
      .then(() => collection.updateAsync({ _id: 'test' }, { $set: { test: 1 } }))
      .catch(done)
  })

  it('optional-previous - update hook should not prefetch previous, via collection option param', function (done) {
    const collection = new Mongo.Collection(null)

    collection.hookOptions.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'] = { fetchPrevious: false }

    collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier, options) {
      if (doc && doc._id === 'test') {
        assert.equal(!!this.previous, false)
        done()
      }
    })

    collection.insertAsync({ _id: 'test', test: 1 })
      .then(() => collection.updateAsync({ _id: 'test' }, { $set: { test: 1 } }))
      .catch(done)
  })
})

if (Meteor.isServer) {
  // The following tests run only on the server due to their requirement for
  // running synchronously. Because the 'fetchPrevious' flag is set on a global
  // (and is meant to be used globally), it has side-effects with our other tests.
  // If we could run this test synchronously on the client, we would. That being
  // said, we aren't testing the difference between server and client, as the
  // functionality is the same for either, so testing only the server is
  // acceptable in this case.
  describe('optional-previous', function (test) {
    it('optional-previous - update hook should not prefetch previous, via defaults param variation 1: after.update', async function () {
      const collection = new Mongo.Collection(null)

      CollectionHooks.defaults.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'] = { fetchPrevious: false }

      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier, options) {
        if (options && options.test) {
          assert.equal(!!this.previous, false)
        }
      })

      CollectionHooks.defaults.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'] = {}

      await collection.insertAsync({ _id: 'test', test: 1 })
      await collection.updateAsync({ _id: 'test' }, { $set: { test: 1 } })
    })

    it('optional-previous - update hook should not prefetch previous, via defaults param variation 2: after.all', async function () {
      const collection = new Mongo.Collection(null)

      CollectionHooks.defaults.after.all = { fetchPrevious: false }

      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier, options) {
        if (options && options.test) {
          assert.equal(!!this.previous, false)
        }
      })

      CollectionHooks.defaults.after.all = {}

      await collection.insertAsync({ _id: 'test', test: 1 })
      await collection.updateAsync({ _id: 'test' }, { $set: { test: 1 } })
    })

    it('optional-previous - update hook should not prefetch previous, via defaults param variation 3: all.update', async function () {
      const collection = new Mongo.Collection(null)

      CollectionHooks.defaults.all.updateAsync = { fetchPrevious: false }

      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier, options) {
        if (options && options.test) {
          assert.equal(!!this.previous, false)
        }
      })

      CollectionHooks.defaults.all.updateAsync = {}

      await collection.insertAsync({ _id: 'test', test: 1 })
      await collection.updateAsync({ _id: 'test' }, { $set: { test: 1 } })
    })

    it('optional-previous - update hook should not prefetch previous, via defaults param variation 4: all.all', async function () {
      const collection = new Mongo.Collection(null)

      CollectionHooks.defaults.all.all = { fetchPrevious: false }

      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier, options) {
        if (options && options.test) {
          assert.equal(!!this.previous, false)
        }
      })

      CollectionHooks.defaults.all.all = {}

      await collection.insertAsync({ _id: 'test', test: 1 })
      await collection.updateAsync({ _id: 'test' }, { $set: { test: 1 } })
    })
  })
}
