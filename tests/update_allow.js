/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

const collection = new Mongo.Collection('test_update_allow_collection')
global.xxx = collection
if (Meteor.isServer) {
  const allow = {
    insert () {
      return true
    },
    update (userId, doc, fieldNames, modifier) {
      return modifier.$set.allowed
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
      updateAsync (userId, doc, fieldNames, modifier) {
        return modifier.$set.allowed
      },
      removeAsync () {
        return true
      }
    })
  }

  collection.allow(allow)

  Meteor.methods({
    test_update_allow_reset_collection: async function () {
      await collection.removeAsync({})
    }
  })

  Meteor.publish('test_update_allow_publish_collection', function () {
    return collection.find()
  })

  collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
    modifier.$set.server_value = true
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_update_allow_publish_collection')

  describe('update - allow', function () {
    it('only one of two collection documents should be allowed to be updated, and should carry the extra server and client properties', function (done) {
      collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
        modifier.$set.client_value = true
      })

      function start (id1, id2) {
        return collection.updateAsync({ _id: id1 }, { $set: { update_value: true, allowed: true } })
          .then(() => collection.updateAsync({ _id: id2 }, { $set: { update_value: true, allowed: false } }))
          .catch(() => collection.find({
            start_value: true,
            update_value: true,
            client_value: true,
            server_value: true
          }).countAsync())
          .then((count) => {
            assert.equal(count, 1)
          })
      }

      InsecureLogin.ready()
        .then(() => Meteor.callAsync('test_update_allow_reset_collection'))
        .then(() => collection.insertAsync({ start_value: true }))
        .then(async (id1) => ({ id1, id2: await collection.insertAsync({ start_value: true }) }))
        .then(({ id1, id2 }) => start(id1, id2))
        .then(() => done())
        .catch(done)
    })
  })
}
