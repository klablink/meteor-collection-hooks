/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { repeat } from './helpers'

const collection = new Mongo.Collection('test_insert_allow_collection')

if (Meteor.isServer) {
  // full client-side access
  // full client-side access
  const allow = {
    insert (userId, doc) {
      return doc.allowed
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
      insertAsync (userId, doc) {
        return doc.allowed
      },
      updateAsync () {
        return true
      },
      removeAsync () {
        return true
      }
    })
  }

  collection.allow(allow)

  Meteor.methods({
    test_insert_allow_reset_collection: async function () {
      await collection.removeAsync({})
    }
  })

  Meteor.publish('test_insert_allow_publish_collection', function () {
    return collection.find()
  })

  collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
    doc.server_value = true
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_insert_allow_publish_collection')

  describe('insert', function () {
    it('insert - only one of two collection documents should be allowed to be inserted, and should carry the extra server and client properties', function (done) {
      collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
        doc.client_value = true
      })

      InsecureLogin.ready()
        .then(() => Meteor.callAsync('test_insert_allow_reset_collection'))
        .then(() => collection.insertAsync({ start_value: true, allowed: false }))
        .then(() => {
          return repeat(async () => {
            const count = await collection.find({
              start_value: true, client_value: true, server_value: true
            }).countAsync()
            if (count === 0) {
              return count
            }
          })
        })
        .then(() => collection.insertAsync({ start_value: true, allowed: true }))
        .catch(() => collection.insertAsync({ start_value: true, allowed: true }))
        .then(() => {
          return repeat(async () => {
            const count = await collection.find({
              start_value: true, client_value: true, server_value: true
            }).countAsync()
            if (count === 1) {
              return count
            }
          })
        })
        .then((count) => {
          assert.equal(count, 1)
          done()
        })
        .catch((err) => {
          // assert.fail('insert - only one of two collection documents should be allowed to be inserted, and should carry the extra server and client properties ' + err.message)
          done(err)
        })
    })
  })
}
