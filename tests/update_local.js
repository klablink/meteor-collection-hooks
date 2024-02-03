/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

describe('update', function () {
  it('local collection documents should have extra property added before being updated', function (done) {
    const collection = new Mongo.Collection(null)

    async function start () {
      collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
        // There should be a userId if we're running on the client.
        // Since this is a local collection, the server should NOT know
        // about any userId
        if (Meteor.isServer) {
          assert.equal(userId, undefined)
        } else {
          assert.notEqual(userId, undefined)
        }

        assert.equal(fieldNames.length, 1)
        assert.equal(fieldNames[0], 'update_value')

        modifier.$set.before_update_value = true
      })

      return collection.updateAsync({ start_value: true }, { $set: { update_value: true } }, { multi: true })
        .then(() =>
          collection.find({ start_value: true, update_value: true, before_update_value: true }).countAsync()
        )
        .then(() => {
          assert.equal(collection.find({ start_value: true, update_value: true, before_update_value: true }).count(), 2)
        })
    }

    InsecureLogin.ready()
      // Add two documents
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => collection.insertAsync({ start_value: true }))
      .then(start)
      .then(() => done())
      .catch(done)
  })

  it('local collection should fire after-update hook', function (done) {
    const collection = new Mongo.Collection(null)
    let c = 0
    const n = () => {
      if (++c === 2) {
        done()
      }
    }

    function start () {
      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
        // There should be a userId if we're running on the client.
        // Since this is a local collection, the server should NOT know
        // about any userId
        if (Meteor.isServer) {
          assert.equal(userId, undefined)
        } else {
          assert.notEqual(userId, undefined)
        }

        assert.equal(fieldNames.length, 1)
        assert.equal(fieldNames[0], 'update_value')

        assert.equal(doc.update_value, true)
        assert.equal(Object.prototype.hasOwnProperty.call(this.previous, 'update_value'), false)

        n()
      })

      return collection.updateAsync({ start_value: true }, { $set: { update_value: true } }, { multi: true })
    }

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => start())
      .catch(done)
  })

  it('local collection should fire before-update hook without options in update and still fire end-callback', function (done) {
    const collection = new Mongo.Collection(null)

    function start () {
      collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
        modifier.$set.before_update_value = true
      })

      return collection.updateAsync({ start_value: true }, { $set: { update_value: true } })
        .then(() => collection.find({ start_value: true, update_value: true, before_update_value: true }).countAsync())
        .then((count) => {
          assert.equal(count, 1)
          done()
        })
    }

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => start())
      .catch(done)
  })

  it('local collection should fire after-update hook without options in update and still fire end-callback', function (done) {
    const collection = new Mongo.Collection(null)
    let c = 0
    const n = () => {
      if (++c === 2) {
        done()
      }
    }

    function start () {
      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](function (userId, doc, fieldNames, modifier) {
        n()
      })

      return collection.updateAsync({ start_value: true }, { $set: { update_value: true } })
        .then(n)
    }

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then(start)
  })

  it('no previous document should be present if fetchPrevious is false', function (done) {
    const collection = new Mongo.Collection(null)

    function start () {
      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](
        function (userId, doc, fieldNames, modifier) {
          assert.equal(this.previous, undefined)
        },
        { fetchPrevious: false }
      )

      return collection.updateAsync({ start_value: true }, { $set: { update_value: true } }, { multi: true })
        .then(() => done())
    }

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => start())
      .catch(done)
  })

  it('a previous document should be present if fetchPrevious is true', function (done) {
    const collection = new Mongo.Collection(null)

    function start () {
      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](
        function (userId, doc, fieldNames, modifier) {
          assert.notEqual(this.previous, undefined)
          assert.notEqual(this.previous.start_value, undefined)
        },
        { fetchPrevious: true }
      )

      return collection.updateAsync({ start_value: true }, { $set: { update_value: true } }, { multi: true })
        .then(() => done())
    }

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => collection.insertAsync({ start_value: true }))
      .then(() => start())
      .catch(done)
  })

  it('a previous document should be present if fetchPrevious is true, but only requested fields if present', function (done) {
    const collection = new Mongo.Collection(null)

    async function start () {
      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](
        function (userId, doc, fieldNames, modifier) {
          assert.notEqual(this.previous, undefined, 'this.previous should not be undefined', false)
          assert.notEqual(this.previous.start_value, undefined, 'this.previous.start_value should not be undefined', false)
          assert.equal(this.previous.another_value, undefined, 'this.previous.another_value should be undefined', false)
        },
        { fetchPrevious: true, fetchFields: { start_value: true } }
      )

      return collection.updateAsync({ start_value: true }, { $set: { update_value: true } }, { multi: true })
    }

    InsecureLogin.ready()
      .then(() => collection.insertAsync({ start_value: true, another_value: true }))
      .then(() => collection.insertAsync({ start_value: true, another_value: true }))
      .then(() => start())
      .then(() => done())
      .catch(done)
  })
})
