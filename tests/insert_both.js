/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { repeat } from './helpers'

if (Meteor.isServer) {
  const collection1 = new Mongo.Collection('test_insert_collection1')
  describe('insert - collection2', function () {
    it('Collection1 document should have extra property added to it before it is inserted', async function (done) {
      const tmp = {}
      await collection1.removeAsync({})

      collection1.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
        // There should be no userId because the insert was initiated
        // on the server -- there's no correlation to any specific user
        tmp.userId = userId // HACK: can't test here directly otherwise refreshing test stops execution here
        doc.before_insert_value = true
      })

      await collection1.insertAsync({ start_value: true })
      assert.equal(await collection1.find({ start_value: true, before_insert_value: true }).countAsync(), 1)
      assert.equal(tmp.userId, undefined)
      done()
    })
  })
}

const collection2 = new Mongo.Collection('test_insert_collection2')

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
    test_insert_reset_collection2: async function () {
      await collection2.removeAsync({})
    }
  })

  Meteor.publish('test_insert_publish_collection2', function () {
    return collection2.find()
  })

  collection2.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
    doc.server_value = true
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_insert_publish_collection2')

  describe('insert - collection2', function () {
    it('collection2 document on client should have client-added and server-added extra properties added to it before it is inserted', function (done) {
      if (Meteor.isFibersDisabled) {
        collection2.before.insertAsync(async function (userId, doc) {
          // console.log('test_insert_collection2 BEFORE INSERT', userId, doc)
          assert.notEqual(userId, undefined, 'the userId should be present since we are on the client')
          assert.equal(await collection2.find({ start_value: true }).countAsync(), 0, 'collection2 should not have the test document in it')
          doc.client_value = true
        })
      } else {
        collection2.before.insert(function (userId, doc) {
          // console.log('test_insert_collection2 BEFORE INSERT', userId, doc)
          assert.notEqual(userId, undefined, 'the userId should be present since we are on the client')
          assert.equal(collection2.find({ start_value: true }).count(), 0, 'collection2 should not have the test document in it')
          doc.client_value = true
        })
      }

      collection2.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
        assert.notEqual(this._id, undefined, 'the _id should be available on this')
      })

      let observer
      InsecureLogin.ready()
        .then(() => Meteor.callAsync('test_insert_reset_collection2'))
        .then(() => {
          return repeat(async () => {
            const count = await collection2.find({}).countAsync()
            if (count === 0) {
              return count
            }
          })
        })
        .then((count) => {
          assert.equal(count, 0, 'collection2 should be empty')
        })
        .then(() => collection2.insertAsync({ start_value: true }))
        .then(() => {
          return new Promise((resolve, reject) => {
            // FIXME: this is not the right way to do this but, it works for now
            observer = collection2.find({}).observeChanges({
              added (id, fields) {
                if (Meteor.isFibersDisabled) {
                  assert.equal(fields.server_value, true, 'collection2 should have the test document with server_value in it')
                  resolve()
                }
              },
              changed (id, fields) {
                assert.equal(fields.server_value, true, 'collection2 should have the test document with server_value in it')
                resolve()
              }
            })
          })
        })
        .then(() => collection2.find({}).countAsync())
        .then((count) => {
          assert.equal(count, 1, 'collection2 should have the test document with client_value AND server_value in it')
          observer && observer.stop()
          done()
        })
        .catch(done)
    })
  })
}
