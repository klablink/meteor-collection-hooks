/* eslint-env mocha */

import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { Meteor } from 'meteor/meteor'

/* eslint-disable no-new */

describe('compat', function () {
  it('compat - "new Mongo.Collection" should not throw an exception', function () {
    try {
      new Mongo.Collection(null)
    } catch (e) {
      assert.fail(e.message)
    }
  })

  it('compat - hooks should work for "new Mongo.Collection"', function (done) {
    simpleCountTest(new Mongo.Collection(null))
      .then(() => done())
      .catch(done)
  })
})

function simpleCountTest (collection) {
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

  collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) { counts.before.insert++ })
  collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc) { counts.before.update++ })
  collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) { counts.before.remove++ })

  collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) { counts.after.insert++ })
  collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc) { counts.after.update++ })
  collection.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) { counts.after.remove++ })

  return InsecureLogin.ready()
    .then(() => collection.insertAsync({ _id: '1', start_value: true }))
    .then((id) => collection.updateAsync({ _id: id }, { $set: { update_value: true } }).then(() => id))
    .then((id) => collection.removeAsync({ _id: id }))
    .then(() => {
      assert.equal(counts.before.insert, 1, 'before insert should have 1 count')
      assert.equal(counts.before.update, 1, 'before update should have 1 count')
      assert.equal(counts.before.remove, 1, 'before remove should have 1 count')
      assert.equal(counts.after.insert, 1, 'after insert should have 1 count')
      assert.equal(counts.after.update, 1, 'after update should have 1 count')
      assert.equal(counts.after.remove, 1, 'after remove should have 1 count')
    })
}
