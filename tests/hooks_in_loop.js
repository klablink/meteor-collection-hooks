/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { repeat } from './helpers'

const collection = new Mongo.Collection('test_hooks_in_loop')
const times = 30

if (Meteor.isServer) {
  let s1 = 0

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

  collection.allow(allow)

  Meteor.methods({
    test_hooks_in_loop_reset_collection: async function () {
      s1 = 0
      await collection.removeAsync({})
    }
  })

  Meteor.publish('test_hooks_in_loop_publish_collection', function () {
    return collection.find()
  })

  collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
    s1++
    modifier.$set.server_counter = s1
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_hooks_in_loop_publish_collection')

  describe('issue #67', () => {
    it('issue #67 - hooks should get called when mutation method called in a tight loop', function (done) {
      let c1 = 0
      let c2 = 0

      collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
        c1++
        modifier.$set.client_counter = c1
      })

      async function check () {
        if (c2 === times) {
          const count = await repeat(async () => {
            const count = await collection.find({
              times: times,
              client_counter: times,
              server_counter: times
            }).countAsync()
            if (count === 1) {
              return count
            }
          })
          assert.equal(count, 1)
          done()
        }
      }

      async function start (id) {
        for (let i = 0; i < times; i++) {
          await collection.updateAsync({ _id: id }, { $set: { times: times } })
          c2++
          await check()
        }
      }

      InsecureLogin.ready()
        .then(() => Meteor.callAsync('test_hooks_in_loop_reset_collection'))
        .then(() => collection.insertAsync({ times: 0, client_counter: 0, server_counter: 0 }))
        .then((id) => start(id))
        .catch(done)
    })
  })
}
