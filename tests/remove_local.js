/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

describe('local remove', function () {
  it('local collection document should affect external variable before being removed', function (done) {
    const collection = new Mongo.Collection(null)

    function start (id) {
      let external = 0

      collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
        // There should be a userId if we're running on the client.
        // Since this is a local collection, the server should NOT know
        // about any userId
        if (Meteor.isServer) {
          assert.equal(userId, undefined)
        } else {
          assert.notEqual(userId, undefined)
        }
        assert.equal(doc.start_value, true)
        external = 1
      })

      return collection.removeAsync({ _id: id })
        .then(() => collection.find({ start_value: true }).countAsync())
        .then((count) => {
          assert.equal(count, 0)
          assert.equal(external, 1)
        })
    }

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then((id) => start(id))
      .then(() => done())
      .catch(done)
  })

  it('local collection should fire after-remove hook and affect external variable', function (done) {
    const collection = new Mongo.Collection(null)
    let external = 0

    let c = 0
    const n = function () {
      if (++c === 2) {
        assert.equal(external, 1)
        done()
      }
    }

    function start (id) {
      collection.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](function (userId, doc) {
        // There should be a userId if we're running on the client.
        // Since this is a local collection, the server should NOT know
        // about any userId
        if (Meteor.isServer) {
          assert.equal(userId, undefined)
        } else {
          assert.notEqual(userId, undefined)
        }

        // The doc should contain a copy of the original doc
        assert.equal(doc._id, id)
        external = 1

        n()
      })

      return collection.removeAsync({ _id: id })
        .then(() => collection.find({ start_value: true }).countAsync())
        .then((count) => {
          assert.equal(count, 0)
          n()
        })
    }

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then((id) => start(id))
      .catch(done)
  })
})
