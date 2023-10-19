/* eslint-env mocha */
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

describe('find', function () {
  it('find - selector should be {} when called without arguments', function (done) {
    const collection = new Mongo.Collection(null)

    // eslint-disable-next-line array-callback-return
    collection.before.find(function (userId, selector, options) {
      assert.deepEqual(selector, {}, 'selector should be {}')
      done()
    })

    collection.find()
  })

  it('find - selector should have extra property', function (done) {
    const collection = new Mongo.Collection(null)

    // eslint-disable-next-line array-callback-return
    collection.before.find(function (userId, selector, options) {
      if (options && options.test) {
        delete selector.bogus_value
        selector.before_find = true
      }
    })

    InsecureLogin.ready()
      .then(() => collection.insert({ start_value: true, before_find: true }))
      .then(() => collection.find({ start_value: true, bogus_value: true }, { test: 1 }).countAsync())
      .then((count) => {
        assert.equal(count, 1)
        done()
      })
      .catch(done)
  })

  it('find - tmp variable should have property added after the find', function (done) {
    const collection = new Mongo.Collection(null)
    const tmp = {}

    // eslint-disable-next-line array-callback-return
    collection.after.find(function (userId, selector, options) {
      if (options && options.test) {
        tmp.after_find = true
      }
    })

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => collection.find({ start_value: true }, { test: 1 }))
      .then(() => assert.equal(tmp.after_find, true))
      .then(() => done())
      .catch(done)
  })
})
