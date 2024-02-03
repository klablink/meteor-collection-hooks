/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { repeat } from './helpers'

const collection1 = new Mongo.Collection('test_update_collection1')

if (Meteor.isServer) {
  describe('update - collection1', function () {
    it('update - collection1 document should have extra property added to it before it is updated', function (done) {
      const tmp = {}

      function start () {
        collection1.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
          // There should be no userId because the update was initiated
          // on the server -- there's no correlation to any specific user
          tmp.userId = userId // HACK: can't directly test here otherwise refreshing test stops execution here
          modifier.$set.before_update_value = true
        })

        return collection1.updateAsync({ start_value: true }, { $set: { update_value: true } }, { multi: true })
          .then(() => collection1.find({
            start_value: true,
            update_value: true,
            before_update_value: true
          }).countAsync())
          .then((count) => {
            assert.equal(count, 2)
            assert.equal(tmp.userId, undefined)
          })
      }

      collection1.removeAsync({})
        .then(() => collection1.insertAsync({ start_value: true }))
        .then(() => collection1.insertAsync({ start_value: true }))
        .then(() => start())
        .then(() => done())
        .catch(done)
    })
  })
}

const collection2 = new Mongo.Collection('test_update_collection2')

if (Meteor.isServer) {
  // full client-side access

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
    async test_update_reset_collection2 () {
      return await collection2.removeAsync({})
    }
  })

  Meteor.publish('test_update_publish_collection2', () => collection2.find())

  collection2.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
    modifier.$set.server_value = true
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_update_publish_collection2')

  describe('update - collection2', function () {
    it('Document should have client-added and server-added extra properties added to it before it is updated', function (done) {
      let c = 0
      const n = () => {
        if (++c === 2) {
          done()
        }
      }

      function start (err, id) {
        if (err) throw err

        collection2.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
          // Insert is initiated on the client, a userId must be present
          assert.notEqual(userId, undefined)

          assert.equal(fieldNames.length, 1)
          assert.equal(fieldNames[0], 'update_value')

          modifier.$set.client_value = true
        })

        collection2.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
          assert.equal(doc.update_value, true)
          assert.equal(Object.prototype.hasOwnProperty.call(this.previous, 'update_value'), false)
          n()
        })

        return collection2.updateAsync({ _id: id }, { $set: { update_value: true } })
          .then(() => {
            return repeat(async () => {
              const count = await collection2.find({
                start_value: true, client_value: true, server_value: true
              }).countAsync()
              if (count === 1) {
                return count
              }
            })
          })
          .then((count) => assert.equal(count, 1))
          .then(n)
      }

      InsecureLogin.ready()
        .then(() => Meteor.callAsync('test_update_reset_collection2'))
        .then(() => collection2.insertAsync({ start_value: true }))
        .then((id) => start(null, id))
        .catch(done)
    })
  })
}
