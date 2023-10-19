/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'

const collection = Meteor.users
const collection1 = new Mongo.Collection('test_insert_mongoid_collection1', { idGeneration: 'MONGO' })

describe('meteor_1_4_id_object', function () {
  if (Meteor.isServer) {
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
    collection1.allow(allow)
  }

  it('meteor_1_4_id_object - after insert hooks should be able to cope with object _id with ops property in Meteor 1.4', function (done) {
    const key = Date.now()

    const aspect1 = collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (nil, doc) {
      if (doc && doc.key && doc.key === key) {
        assert.equal(doc._id, this._id)
        assert.isFalse(Object(doc._id) === doc._id, '_id property should not be an object')
      }
    })

    collection.insertAsync({ key: key })
      .then((id) => collection.removeAsync({ _id: id }))
      .then(() => aspect1.remove())
      .then(() => done())
      .catch(done)
  })

  if (Meteor.isServer) {
    it('meteor_1_4_id_object - after insert hooks should be able to cope with Mongo.ObjectID _id with _str property in Meteor 1.4', function (done) {
      const key = Date.now()

      const aspect1 = collection1.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](async function (nil, doc) {
        if (doc && doc.key && doc.key === key) {
          let foundDoc = null
          try {
            foundDoc = await collection1.direct.findOneAsync({ _id: doc._id })
          } catch (exception) {
          }
          assert.isNotNull(foundDoc)
        }
      })

      collection1.insertAsync({ key: key })
        .then((id) => collection1.removeAsync({ _id: id }))
        .then(() => aspect1.remove())
        .then(() => done())
        .catch(done)
    })
  } else {
    it('meteor_1_4_id_object - after insert hooks should be able to cope with Mongo.ObjectID _id with _str property in Meteor 1.4', function (done) {
      const key = Date.now()

      const aspect1 = collection1.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](function (nil, doc) {
        if (doc && doc.key && doc.key === key) {
          let foundDoc = null
          try {
            foundDoc = collection1.direct.findOne({ _id: doc._id })
          } catch (exception) {
          }
          assert.isNotNull(foundDoc)
        }
      })

      collection1.insertAsync({ key: key })
        .then((id) => collection1.removeAsync({ _id: id }))
        .then(() => aspect1.remove())
        .then(() => done())
        .catch(done)
    })
  }
})
