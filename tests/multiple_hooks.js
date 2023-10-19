/* eslint-env mocha */

import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { Meteor } from 'meteor/meteor'

describe('multiple_hooks', function () {
  it('general - multiple hooks should all fire the appropriate number of times', function (done) {
    const collection = new Mongo.Collection(null)
    const counts = {
      before: {
        insert: 0,
        update: 0,
        remove: 0
      },
      after: {
        insert: 0,
        update: 0,
        remove: 0
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

    collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function () {
      counts.before.insert++
    })
    collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function () {
      counts.before.update++
    })
    collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function () {
      counts.before.remove++
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

    collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function () {
      counts.after.insert++
    })
    collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function () {
      counts.after.update++
    })
    collection.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function () {
      counts.after.remove++
    })

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then((id) => collection.updateAsync({ _id: id }, { $set: {} }).then(() => id))
      .then((id) => collection.removeAsync({ _id: id }))
      .then(() => {
        assert.equal(counts.before.insert, 2)
        assert.equal(counts.before.update, 2)
        assert.equal(counts.before.remove, 2)
        assert.equal(counts.after.insert, 2)
        assert.equal(counts.after.update, 2)
        assert.equal(counts.after.remove, 2)
        done()
      })
      .catch(done)
  })
})
