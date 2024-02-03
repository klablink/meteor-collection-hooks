/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { repeat } from './helpers'

// XXX: Code below throws
// TypeError: Cannot read property '#<Object>' of undefined
// No idea why...

// ([null, 'direct_collection_test']).forEach(function (ctype) {
//   Tinyassert.add(`direct - hooks should not be fired when using .direct (collection type ${ctype})`, function (test) {
//     // console.log('-------', ctype)

//     const collection = new Mongo.Collection(ctype, {connection: null})
//     let hookCount = 0

//     // The server will make a call to find when findOne is called, which adds 2 extra counts
//     // Update will make calls to find with options forwarded, which adds 4 extra counts
//     const hookCountTarget = Meteor.isServer ? 16 : 14

//     // Full permissions on collection
//     collection.allow({
//       insert: function () { return true },
//       update: function () { return true },
//       remove: function () { return true }
//     })

//     collection.before.insert(function (userId, doc) {
//       if (doc && doc.test) {
//         hookCount++
//         // console.log(ctype, ': before insert', hookCount)
//       }
//     })

//     collection.after.insert(function (userId, doc) {
//       if (doc && doc.test) {
//         hookCount++
//         // console.log(ctype, ': after insert', hookCount)
//       }
//     })

//     collection.before.update(function (userId, doc, fieldNames, modifier, options) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': before update', hookCount)
//       }
//     })

//     collection.after.update(function (userId, doc, fieldNames, modifier, options) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': after update', hookCount)
//       }
//     })

//     collection.before.remove(function (userId, doc) {
//       if (doc && doc._id === 'test') {
//         hookCount++
//         // console.log(ctype, ': before remove', hookCount)
//       }
//     })

//     collection.after.remove(function (userId, doc) {
//       if (doc && doc._id === 'test') {
//         hookCount++
//         // console.log(ctype, ': after remove', hookCount)
//       }
//     })

//     collection.before.find(function (userId, selector, options) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': before find', hookCount)
//       }
//     })

//     collection.after.find(function (userId, selector, options, result) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': after find', hookCount)
//       }
//     })

//     collection.before.findOne(function (userId, selector, options) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': before findOne', hookCount)
//       }
//     })

//     collection.after.findOne(function (userId, selector, options, result) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': after findOne', hookCount)
//       }
//     })

//     collection.insert({_id: 'test', test: 1})
//     collection.update({_id: 'test'}, {$set: {test: 1}}, {test: 1})
//     collection.find({}, {test: 1})
//     collection.findOne({}, {test: 1})
//     collection.remove({_id: 'test'})

//     assert.equal(hookCount, hookCountTarget)

//     // These should in no way affect the hookCount, which is essential in proving
//     // that the direct calls are functioning as intended
//     collection.direct.insert({_id: 'test', test: 1})

//     collection.direct.update({_id: 'test'}, {$set: {test: 1}}, {test: 1})

//     const cursor = collection.direct.find({}, {test: 1})
//     const count = cursor.count()
//     assert.equal(count, 1)

//     const doc = collection.direct.findOne({}, {test: 1})
//     assert.equal(doc.test, 1)

//     collection.direct.remove({_id: 'test'})

//     assert.equal(hookCount, hookCountTarget)
//   })
// })

describe('direct', function () {
  [{}, { connection: null }].forEach(function (conntype, i) {
    [null, 'direct_collection_test_stringid'].forEach(function (ctype) {
      const cname = ctype && (ctype + i)
      it(`direct - update and remove should allow removing by _id string (${cname}, ${JSON.stringify(conntype)})`, function (done) {
        if (Meteor.isClient) {
          console.log('direct - update and remove should allow removing by _id string', cname, JSON.stringify(conntype))
        }

        const collection = new Mongo.Collection(cname, conntype)

        const allow = {
          insert: function () {
            return true
          },
          update: function () {
            return true
          },
          remove: function () {
            return true
          }
        }

        if (Meteor.isFibersDisabled) {
          Object.assign(allow,
            {
              insertAsync: function () {
                return true
              },
              updateAsync: function () {
                return true
              },
              removeAsync: function () {
                return true
              }
            })
        }

        // Full permissions on collection
        collection.allow(allow)

        async function hasCountAndTestValue (count, value, msg) {
          const actual = await repeat(async () => {
            const actual = await collection.direct.find({ _id: 'testid', test: value }).countAsync()
            if (actual === count) return actual
          }, 20)
          assert.equal(actual, count, `${msg} count should be ${count} but, it is ${actual}`)
        }

        if (Meteor.isServer) {
          collection.direct.removeAsync({ _id: 'testid' })
            .then(() => collection.direct.insertAsync({ _id: 'testid', test: 1 }))
            .then(() => hasCountAndTestValue(1, 1, 'insert'))
            .then(() => collection.direct.updateAsync('testid', { $set: { test: 2 } }))
            .then(() => hasCountAndTestValue(1, 2, 'update'))
            .then(() => collection.direct.removeAsync('testid'))
            .then(() => hasCountAndTestValue(0, 2, 'remove'))
            .then(() => done())
            .catch(done)
        } else {
          collection.direct.removeAsync({ _id: 'testid' })
            .then(() => collection.direct.insertAsync({ _id: 'testid', test: 1 }).stubPromise)
            .then(() => hasCountAndTestValue(1, 1, 'insert'))
            .then(() => collection.direct.updateAsync('testid', { $set: { test: 2 } }).stubPromise)
            .then(() => hasCountAndTestValue(1, 2, 'update'))
            .then(() => collection.direct.removeAsync('testid').stubPromise)
            .then(() => hasCountAndTestValue(0, 2, 'remove'))
            .then(() => done())
            .catch(done)
        }
      })
    })
  })

  it('Test find direct', function (done) {
    const coll = new Mongo.Collection('test_find', { connection: null })
    const cursorDirect = coll.direct.find()

    assert.isFalse(cursorDirect && typeof cursorDirect.then === 'function')
    assert.isNumber(cursorDirect.count())

    const cursor = coll.find()
    assert.isFalse(cursorDirect && typeof cursorDirect.then === 'function')
    assert.isNumber(cursor.count())
    cursor.countAsync()
      .then((count) => {
        assert.isNumber(count)
        assert.equal(count, 0)
      })
      .then(() => done())
      .catch(done)
  })

  it('Test update direct', function (done) {
    const coll = new Mongo.Collection('test_find', { connection: null })

    coll.before.find(() => {
      throw new Error('before find should not be called')
    })

    coll.direct.insertAsync({ test: true })
      .then((id) => coll.direct.updateAsync({ test: true }, { $set: { test: false } }))
      .then(() => done())
      .catch(done)
  })

  if (Meteor.isFibersDisabled && Meteor.isClient) {
    it('Test prosimes returned from a direct call', function (done) {
      const coll = new Mongo.Collection('test_promises')

      const res = coll.direct.insertAsync({ test: true })
      assert.equal(typeof res, 'object')
      assert.isFunction(res.then)
      assert.isFunction(res.catch)
      assert.equal(typeof res.stubPromise, 'object')
      assert.isFunction(res.stubPromise.then)
      assert.isFunction(res.stubPromise.catch)
      done()
    })
  }

  if (Meteor.isServer) {
    it('direct - Meteor.users.direct.insert should return _id, not an object', function (done) {
      Meteor.users.removeAsync('directinserttestid')
        .then(() => Meteor.users.direct.insertAsync({ _id: 'directinserttestid', test: 1 }))
        .then((result) => {
          assert.isFalse(Object(result) === result)
          done()
        })
        .catch(done)
    })
  }
})
