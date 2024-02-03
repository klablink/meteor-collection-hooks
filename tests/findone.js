/* eslint-env mocha */

import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { Meteor } from 'meteor/meteor'

describe('findone', function () {
  it('selector should be {} when called without arguments', function (done) {
    const collection = new Mongo.Collection(null)

    collection.before[Meteor.isFibersDisabled ? 'findOneAsync' : 'findOne'](function (userId, selector, options) {
      assert.deepEqual(selector, {})
      done()
    })

    collection.findOneAsync()
      .catch(done)
  })

  it('selector should have extra property', function (done) {
    const collection = new Mongo.Collection(null)

    collection.before[Meteor.isFibersDisabled ? 'findOneAsync' : 'findOne'](function (userId, selector, options) {
      if (options && options.test) {
        delete selector.bogus_value
        selector.before_findone = true
      }
    })

    InsecureLogin.ready()
    collection.insertAsync({ start_value: true, before_findone: true })
      .then(() => collection.findOneAsync({ start_value: true, bogus_value: true }, { test: 1 }))
      .then((doc) => {
        assert.equal(doc.before_findone, true)
        done()
      })
      .catch(done)
  })

  it('tmp variable should have property added after the find', function (done) {
    const collection = new Mongo.Collection(null)
    const tmp = {}

    collection.after[Meteor.isFibersDisabled ? 'findOneAsync' : 'findOne'](function (userId, selector, options) {
      if (options && options.test) {
        tmp.after_findone = true
      }
    })

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => collection.findOneAsync({ start_value: true }, { test: 1 }))
      .then(() => assert.equal(tmp.after_findone, true))
      .then(() => done())
      .catch(done)
  })
})
