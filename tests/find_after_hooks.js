/* eslint-env mocha */

import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { Meteor } from 'meteor/meteor'

describe('issue #296', function () {
  it('issue #296 - after update hook always finds all updated', function (done) {
    const collection = new Mongo.Collection(null)

    collection.before.find((userId, selector) => {
      selector.removedAt = { $exists: false }

      return true
    })

    let beforeCalled = false
    collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](() => {
      beforeCalled = true
    })

    let afterCalled = false
    collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](() => {
      afterCalled = true
    })

    collection.insertAsync({ test: true })
      .then(() => collection.updateAsync({ test: true }, { $set: { removedAt: new Date() } }))
      .then(() => {
        assert.equal(beforeCalled, true)
        assert.equal(afterCalled, true)
        done()
      })
      .catch(done)
  })

  it('issue #296 - after insert hook always finds all inserted', function (done) {
    const collection = new Mongo.Collection(null)

    collection.before.find((userId, selector) => {
      selector.removedAt = { $exists: false }

      return true
    })

    let beforeCalled = false
    collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](() => {
      beforeCalled = true
    })

    let afterCalled = false
    collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](() => {
      afterCalled = true
    })

    collection.insertAsync({ removedAt: new Date() })
      .then(() => {
        assert.equal(beforeCalled, true)
        assert.equal(afterCalled, true)
        done()
      })
      .catch(done)
  })
})
