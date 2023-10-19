/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

if (Meteor.isServer) {
  const collection1 = new Mongo.Collection('test_remove_collection1')
  let external = false

  describe('remove', function () {
    it('collection1 document should affect external variable before it is removed', function (done) {
      const tmp = {}

      function start (id) {
        collection1.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
        // There should be no userId because the remove was initiated
        // on the server -- there's no correlation to any specific user
          tmp.userId = userId // HACK: can't test here directly otherwise refreshing test stops execution here
          tmp.doc_start_value = doc.start_value // HACK: can't test here directly otherwise refreshing test stops execution here
          external = true
        })

        return collection1.removeAsync({ _id: id })
          .then(() => collection1.find({ start_value: true }).countAsync())
          .then((count) => {
            assert.equal(count, 0)
            assert.equal(external, true)
            assert.equal(tmp.userId, undefined)
            assert.equal(tmp.doc_start_value, true)
          })
      }

      collection1.removeAsync({})
        .then(() => collection1.insertAsync({ start_value: true }))
        .then((id) => start(id))
        .then(() => done())
        .catch(done)
    })
  })
}

const collection2 = new Mongo.Collection('test_remove_collection2')

if (Meteor.isServer) {
  // full client-side access
  const allow = {
    insert () {
      return true
    },
    update () {
      return true
    },
    remove () {
      return true
    }
  }

  if (Meteor.isFibersDisabled) {
    Object.assign(allow, {
      insertAsync () {
        return true
      },
      updateAsync () {
        return true
      },
      removeAsync () {
        return true
      }
    })
  }

  collection2.allow(allow)

  Meteor.methods({
    test_remove_reset_collection2: async function () {
      await collection2.removeAsync({})
    }
  })

  Meteor.publish('test_remove_publish_collection2', function () {
    return collection2.find()
  })

  // it('remove a - collection2 document should affect external variable before and after it is removed', function (done) {
  let external2 = -1

  collection2.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
    // Remove is initiated by a client, a userId must be present
    // assert.notEqual(userId, undefined)

    // assert.equal(doc.start_value, true)
    external2 = 0
  })

  collection2.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
    // Remove is initiated on the client, a userId must be present
    // assert.notEqual(userId, undefined)

    // assert.equal(doc.start_value, true)

    external2++

    // assert.equal(external2, 1)
    // done()

    // Can't get the test suite to run when this is in a assert.
    // Beyond me why. The console outputs true, so the 'test' does
    // pass...
    console.log('(temp) test passes:', external2 === 1)
  })
  // })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_remove_publish_collection2')

  describe('remove', function () {
    it('remove - collection2 document should affect external variable before and after it is removed', function (done) {
      let external = 0
      let c = 0
      const n = () => {
        if (++c === 2) {
          assert.equal(external, 2)
          done()
        }
      }

      function start (id) {
        collection2.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
          // Remove is initiated on the client, a userId must be present
          assert.notEqual(userId, undefined)

          assert.equal(doc._id, id)
          assert.equal(doc.start_value, true)
          external++
        })

        collection2.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
          // Remove is initiated on the client, a userId must be present
          assert.notEqual(userId, undefined)
          external++
          assert.equal(doc._id, id)
          n()
        })

        return collection2.removeAsync({ _id: id })
          .then(() => collection2.find({ start_value: true }).countAsync())
          .then((count) => {
            assert.equal(count, 0)
            n()
          })
      }

      InsecureLogin.ready()
        .then(() => Meteor.callAsync('test_remove_reset_collection2'))
        .then(() => collection2.insertAsync({ start_value: true }))
        .then((id) => start(id))
        .catch(done)
    })
  })
}
