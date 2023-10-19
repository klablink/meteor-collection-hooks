/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

const collection = new Mongo.Collection('test_remove_allow_collection')

if (Meteor.isServer) {
  const allow = {
    insert () {
      return true
    },
    update () {
      return true
    },
    remove (userId, doc) {
      return doc.allowed
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
      removeAsync (userId, doc) {
        return doc.allowed
      }
    })
  }

  collection.allow(allow)

  Meteor.methods({
    test_remove_allow_reset_collection: async function () {
      await collection.removeAsync({})
    }
  })

  Meteor.publish('test_remove_allow_publish_collection', function () {
    return collection.find()
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_remove_allow_publish_collection')

  describe('remove - allow', function () {
    it('remove - only one of two collection documents should be allowed to be removed', function (done) {
      collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
        assert.equal(doc.start_value, true)
      })

      function start (id1, id2) {
        return collection.removeAsync({ _id: id1 })
          .then(() => collection.removeAsync({ _id: id2 }))
          .then(() => assert.equal(collection.find({ start_value: true }).countAsync()))
          .then((count) => {
            assert.equal(count, 1, 'only one document should remain')
          })
      }

      InsecureLogin.ready()
        .then(() => Meteor.callAsync('test_remove_allow_reset_collection'))
        .then(() => collection.insertAsync({ start_value: true, allowed: true }))
        .then(async (id1) => ({ id1, id2: await collection.insertAsync({ start_value: true, allowed: false }) }))
        .catch(({ id1, id2 }) => start(id1, id2))
        .then(() => done())
        .catch(done)
    })
  })
}
