/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

describe('upsert', function () {
  before(async function () {
    await InsecureLogin.ready()
  })

  it('upsert - hooks should all fire the appropriate number of times', function (done) {
    const collection = new Mongo.Collection(null)
    const counts = {
      before: {
        insert: 0,
        update: 0,
        remove: 0,
        upsert: 0
      },
      after: {
        insert: 0,
        update: 0,
        remove: 0,
        upsert: 0
      }
    }

    collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function () {
      counts.before.insert++
    })
    collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function () {
      counts.before.update++
    })
    collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function () {
      counts.before.remove++
    })
    collection.before[Meteor.isFibersDisabled ? 'upsertAsync' : 'upsert'](function () {
      counts.before.upsert++
    })

    collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function () {
      counts.after.insert++
    })
    collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function () {
      counts.after.update++
    })
    collection.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function () {
      counts.after.remove++
    })
    collection.after[Meteor.isFibersDisabled ? 'upsertAsync' : 'upsert'](function () {
      counts.after.upsert++
    })

    collection.removeAsync({ test: true })
      .then(() => collection.upsertAsync({ test: true }, { test: true, step: 'insert' }))
      .then((obj) => collection.upsertAsync(obj.insertedId, { test: true, step: 'update' }))
      .then(() => {
        assert.equal(counts.before.insert, 0, 'before.insert should be 0')
        assert.equal(counts.before.update, 0, 'before.update should be 0')
        assert.equal(counts.before.remove, 0, 'before.remove should be 0')
        assert.equal(counts.before.upsert, 2, 'before.upsert should be 2')
        assert.equal(counts.after.insert, 1, 'after.insert should be 1')
        assert.equal(counts.after.update, 1, 'after.update should be 1')
        assert.equal(counts.after.remove, 0, 'after.remove should be 0')
        assert.equal(counts.after.upsert, 0, 'after.upsert should be 0')
        done()
      })
      .catch(done)
  })

  if (Meteor.isServer) {
    it('upsert - hooks should all fire the appropriate number of times in a synchronous environment', function (done) {
      const collection = new Mongo.Collection(null)
      const counts = {
        before: {
          insert: 0,
          update: 0,
          remove: 0,
          upsert: 0
        },
        after: {
          insert: 0,
          update: 0,
          remove: 0,
          upsert: 0
        }
      }

      collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function () {
        counts.before.insert++
      })
      collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function () {
        counts.before.update++
      })
      collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function () {
        counts.before.remove++
      })
      collection.before[Meteor.isFibersDisabled ? 'upsertAsync' : 'upsert'](function () {
        counts.before.upsert++
      })

      collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function () {
        counts.after.insert++
      })
      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function () {
        counts.after.update++
      })
      collection.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function () {
        counts.after.remove++
      })
      collection.after[Meteor.isFibersDisabled ? 'upsertAsync' : 'upsert'](function () {
        counts.after.upsert++
      })

      collection.removeAsync({ test: true })
        .then(() => collection.upsertAsync({ test: true }, { test: true, step: 'insert' }))
        .then((obj) => collection.upsertAsync(obj.insertedId, { test: true, step: 'update' }))
        .then(() => {
          assert.equal(counts.before.insert, 0, 'before.insert should be 0')
          assert.equal(counts.before.update, 0, 'before.update should be 0')
          assert.equal(counts.before.remove, 0, 'before.remove should be 0')
          assert.equal(counts.before.upsert, 2, 'before.insert should be 2')
          assert.equal(counts.after.insert, 1, 'after.insert should be 1')
          assert.equal(counts.after.update, 1, 'after.update should be 1')
          assert.equal(counts.after.remove, 0, 'after.remove should be 0')
          assert.equal(counts.after.upsert, 0, 'after.upsert should be 0')
        })
        .then(() => done())
        .catch(done)
    })
  }

  it('upsert before.upsert can stop the execution', async function () {
    const collection = new Mongo.Collection(null)

    collection.before[Meteor.isFibersDisabled ? 'upsertAsync' : 'upsert'](() => false)

    await collection.removeAsync({ test: true })
    await collection.upsertAsync({ test: true }, { $set: { test: true } })

    assert.isUndefined(await collection.findOneAsync({ test: true }), 'doc should not exist')
  })

  it('upsert after.update should have a correct prev-doc', function (done) {
    const collection = new Mongo.Collection(null)

    collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc) {
      assert.isNotNull(this.previous, 'this.previous should not be undefined')
      assert.equal(this.previous.step, 'inserted', 'previous doc should have a step property equal to inserted')
      assert.equal(doc.step, 'updated', 'doc should have a step property equal to updated')
      done()
    })

    collection.removeAsync({ test: true })
      .then(() => collection.insertAsync({ test: true, step: 'inserted' }))
      .then(() => collection.upsertAsync({ test: true }, { $set: { step: 'updated' } }))
      .catch(done)
  })

  it('upsert after.update should have the list of manipulated fields', function (done) {
    const collection = new Mongo.Collection(null)

    collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fields) {
      assert.deepEqual(fields, ['step'])
      done()
    })

    collection.removeAsync({ test: true })
      .then(() => collection.insertAsync({ test: true, step: 'inserted' }))
      .then(() => collection.upsertAsync({ test: true }, { $set: { step: 'updated' } }))
      .catch(done)
  })

  it('issue #156 - upsert after.insert should have a correct doc using $set', function (done) {
    const collection = new Mongo.Collection(null)

    collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
      assert.isNotNull(doc, 'doc should not be undefined')
      assert.isNotNull(doc._id, 'doc should have an _id property')
      assert.isNotNull(doc.test, 'doc should have a test property')
      assert.equal(doc.step, 'insert-async', 'doc should have a step property equal to insert-async')
      done()
    })

    collection.removeAsync({ test: true })
      .then(() => collection.upsertAsync({ test: true }, { $set: { test: true, step: 'insert-async' } }))
      .catch(done)
  })

  if (Meteor.isServer) {
    it('issue #156 - upsert after.insert should have a correct doc using $set in synchronous environment', function (done) {
      const collection = new Mongo.Collection(null)

      collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
        assert.isNotNull(doc, 'doc should not be undefined')
        assert.isNotNull(doc._id, 'doc should have an _id property')
        assert.isNotNull(doc.test, 'doc should have a test property')
        assert.equal(doc.step, 'insert-sync', 'doc should have a step property equal to insert-sync')
        done()
      })

      collection.removeAsync({ test: true })
        .then(() => collection.upsertAsync({ test: true }, { $set: { test: true, step: 'insert-sync' } }))
    })
  }
})
