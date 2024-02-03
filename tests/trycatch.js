/* eslint-env mocha */

import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'
import { Meteor } from 'meteor/meteor'

describe('upsert', function () {
  before(function (done) {
    InsecureLogin.ready()
      .then(() => done())
      .catch(done)
  })

  it('try-catch - should call error callback on insert hook exception', function (done) {
    const collection = new Mongo.Collection(null)
    const msg = 'insert hook test error'

    collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
      throw new Error(msg)
    })

    // try {
    collection.insertAsync({ test: 1 })
      .catch(err => {
        assert.equal(err && err.message, msg)
        done()
      })
  })

  it('try-catch - should call error callback on update hook exception', function (done) {
    const collection = new Mongo.Collection(null)
    const msg = 'update hook test error'

    collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc) {
      throw new Error(msg)
    })

    let _id
    collection.insertAsync({ test: 1 })
      .then((id) => {
        _id = id
        return collection.updateAsync(id, { test: 2 })
      })
      .catch(err => {
        assert.equal(err && err.message, msg)
      })
      .then(() => collection.updateAsync(_id, { test: 3 }))
      .catch(err => {
        assert.equal(err && err.message, msg)
        done()
      })
      .catch(done)
  })

  it('try-catch - should call error callback on remove hook exception', function (done) {
    const collection = new Mongo.Collection(null)
    const msg = 'remove hook test error'

    collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
      throw new Error(msg)
    })

    collection.insertAsync({ test: 1 })
      .then((id) => collection.removeAsync(id))
      .catch(err => {
        assert.equal(err && err.message, msg)
        done()
      })
  })
})
