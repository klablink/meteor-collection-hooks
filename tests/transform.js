/* eslint-env mocha */

import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { Meteor } from 'meteor/meteor'

const isFunction = (fn) => typeof fn === 'function'

describe('general', function () {
  it('general - hook callbacks should have this.transform function that works', function (done) {
    const collection = new Mongo.Collection(null, {
      transform: doc => ({ ...doc, isTransformed: true })
    })

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

    collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
      if (isFunction(this.transform) && this.transform().isTransformed) {
        counts.before.insert++
      }
    })
    collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc) {
      if (isFunction(this.transform) && this.transform().isTransformed) {
        counts.before.update++
      }
    })
    collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
      if (isFunction(this.transform) && this.transform().isTransformed) {
        counts.before.remove++
      }
    })

    collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
      if (isFunction(this.transform) && this.transform().isTransformed) {
        counts.after.insert++
      }
    })
    collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc) {
      if (isFunction(this.transform) && this.transform().isTransformed) {
        counts.after.update++
      }
    })
    collection.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
      if (isFunction(this.transform) && this.transform().isTransformed) {
        counts.after.remove++
      }
    })

    // TODO: does it make sense to pass an _id on insert just to get this test
    // to pass? Probably not. Think more on this -- it could be that we simply
    // shouldn't be running a .transform() in a before.insert -- how will we
    // know the _id? And that's what transform is complaining about.
    InsecureLogin.ready()
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
        done()
      })
      .catch(done)
  })
})
