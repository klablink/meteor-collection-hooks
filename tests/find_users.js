/* eslint-env mocha */

import { Meteor } from 'meteor/meteor'
import { assert } from 'chai'
import { InsecureLogin } from './insecure_login'

describe('find users', function () {
  it('find hooks should be capable of being used on special Meteor.users collection', function (done) {
    // eslint-disable-next-line array-callback-return
    const aspect1 = Meteor.users.before.find(function (userId, selector, options) {
      if (selector && selector.test) {
        selector.a = 1
      }
    })

    // eslint-disable-next-line array-callback-return
    const aspect2 = Meteor.users.after.find(function (userId, selector, options) {
      if (selector && selector.test) {
        selector.b = 1
      }
    })

    InsecureLogin.ready()
      .then(() => {
        const selector = { test: 1 }

        Meteor.users.find(selector)
        assert.equal(Object.prototype.hasOwnProperty.call(selector, 'a'), true)
        assert.equal(Object.prototype.hasOwnProperty.call(selector, 'b'), true)
        aspect1.remove()
        aspect2.remove()
      })
      .then(() => Meteor.users.find().countAsync())
      .then((count) => {
        assert.notEqual(count, 0)
        done()
      })
  })

  it('find hooks should be capable of being used on wrapped Meteor.users collection', function (done) {
    function TestUser (doc) {
      return Object.assign(this, doc)
    }

    Meteor.users.__transform = doc => new TestUser(doc)

    const MeteorUsersFind = Meteor.users.find

    Meteor.users.find = function (selector = {}, options = {}) {
      return MeteorUsersFind.call(this, selector, { transform: Meteor.users.__transform, ...options })
    }

    // eslint-disable-next-line array-callback-return
    const aspect1 = Meteor.users.before.find(function (userId, selector, options) {
      if (selector && selector.test) {
        selector.a = 1
      }
    })

    // eslint-disable-next-line array-callback-return
    const aspect2 = Meteor.users.after.find(function (userId, selector, options) {
      if (selector && selector.test) {
        selector.b = 1
      }
    })

    InsecureLogin.ready()
      .then(() => {
        const selector = { test: 1 }
        Meteor.users.find(selector)
        assert.equal(Object.prototype.hasOwnProperty.call(selector, 'a'), true)
        assert.equal(Object.prototype.hasOwnProperty.call(selector, 'b'), true)
        aspect1.remove()
        aspect2.remove()
      })
      .then(() => Meteor.users.find().countAsync())
      .then((count) => {
        assert.notEqual(count, 0)
        done()
      })
      .finally(() => {
        Meteor.users.find = MeteorUsersFind
      })
  })
})
