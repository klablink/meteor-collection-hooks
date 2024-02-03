/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { assert } from 'chai'

describe('insert', function () {
  it('insert - Meteor.users collection document should have extra property added before being inserted and properly provide inserted _id in after hook', function (done) {
    const collection = Meteor.users

    const aspect1 = collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (nil, doc) {
      if (doc && doc.test) {
        doc.before_insert_value = true
      }
    })

    const aspect2 = collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (nil, doc) {
      if (doc && doc.test) {
        assert.equal(doc._id, this._id)
        assert.isFalse(Array.isArray(doc._id))
      }
    })

    collection.insert({ start_value: true, test: 1 }, function (err, id) {
      if (err) throw err
      assert.notEqual(collection.find({ start_value: true, before_insert_value: true }).count(), 0)
      collection.remove({ _id: id })
      aspect1.remove()
      aspect2.remove()
      done()
    })
  })
})
