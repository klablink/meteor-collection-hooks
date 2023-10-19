/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

describe('insert', function () {
  it('Local collection document should have extra property added before being inserted', function (done) {
    const collection = new Mongo.Collection(null)
    const tmp = {}

    collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
      tmp.typeof_userId = typeof userId
      doc.before_insert_value = true
    })

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => {
        if (Meteor.isServer) {
          assert.equal(tmp.typeof_userId, 'undefined', 'Local collection on server should NOT know about a userId')
        } else {
          assert.equal(tmp.typeof_userId, 'string', 'There should be a userId on the client')
        }
      })
      .then(() => collection.find({ start_value: true, before_insert_value: true }).countAsync())
      .then((count) => {
        assert.equal(count, 1)
      })
      .then(done)
      .catch(done)
  })

  it('Local collection should fire after-insert hook', function (done) {
    const collection = new Mongo.Collection(null)

    collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (userId, doc) {
      if (Meteor.isServer) {
        assert.equal(typeof userId, 'undefined', 'Local collection on server should NOT know about a userId')
      } else {
        assert.equal(typeof userId, 'string', 'There should be a userId on the client')
      }

      assert.notEqual(doc.start_value, undefined, 'doc should have start_value')
      assert.notEqual(this._id, undefined, 'should provide inserted _id on this')

      done()
    })

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .catch(done)
  })

  if (Meteor.isClient) {
    it('Local collection should throw an excexpiont for an asyn before-insert hook', function (done) {
      const collection = new Mongo.Collection(null)

      collection.before.insert(async function (userId, doc) {
      })

      InsecureLogin.ready()
        .then(() => collection.insert({ start_value: true }))
        .catch((e) => {
          assert.equal(e.message, 'insert hook must be synchronous. Use insertAsync instead.')
          done()
        })
    })
  }
})
