import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

const collection = new Mongo.Collection('test_remove_allow_collection')

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insert () { return true },
    update () { return true },
    remove (userId, doc) { return doc.allowed },
    removeAsync (userId, doc) { return doc.allowed }
  })

  Meteor.methods({
    test_remove_allow_reset_collection: function () {
      return collection.removeAsync({})
    }
  })

  Meteor.publish('test_remove_allow_publish_collection', function () {
    return collection.find()
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_remove_allow_publish_collection')

  Tinytest.addAsync('remove - only one of two collection documents should be allowed to be removed', function (test, next) {
    collection.before.remove(function (userId, doc) {
      test.equal(doc.start_value, true)
    })

    InsecureLogin.ready(function () {
      Meteor.call('test_remove_allow_reset_collection', function (nil, result) {
        async function start (id1, id2) {
          // TODO(v3): allow-deny
          await collection.removeAsync({ _id: id1 })
          // just ignore the error
          await collection.removeAsync({ _id: id2 }).catch((err) => {})

          test.equal(collection.find({ start_value: true }).count(), 1, 'only one document should remain')
          next()
        }

        // Insert two documents
        collection.insert({ start_value: true, allowed: true }, function (err1, id1) {
          collection.insert({ start_value: true, allowed: false }, function (err2, id2) {
            start(id1, id2)
          })
        })
      })
    })
  })
}
