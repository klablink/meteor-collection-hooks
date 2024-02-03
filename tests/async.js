/* eslint-env mocha */

import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { Meteor } from 'meteor/meteor'

if (Mongo.Collection.prototype.insertAsync) {
  // Before
  describe('async', function () {
    it('async - before - insertAsync', async () => {
      const collection = new Mongo.Collection(null)

      collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert']((userId, doc) => {
        doc.called = true
      })

      const id = await collection.insertAsync({ test: true })

      assert.isTrue((await collection.findOneAsync(id)).called)
    })

    it('async - direct - insertAsync', async () => {
      const collection = new Mongo.Collection(null)

      collection.before[Meteor.isFibersDisabled ? 'insertAsync' : 'insert']((userId, doc) => {
        doc.called = true
      })

      const id = await collection.direct.insertAsync({ test: true })
      assert.isFalse(!!(await collection.findOneAsync(id)).called)
    })

    it('async - before - findOneAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.before[Meteor.isFibersDisabled ? 'findOneAsync' : 'findOne'](() => {
        called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.findOneAsync(id)

      assert.isTrue(called)
    })

    it('async - before - findAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      // eslint-disable-next-line array-callback-return
      collection.before.find(() => {
        called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.find(id).fetchAsync()

      assert.isTrue(called)
    })

    it('async - before - updateAsync', async () => {
      const collection = new Mongo.Collection(null)

      collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update']((userId, doc, fieldNames, modifier) => {
        modifier.$set.called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.updateAsync(id, { $set: { test: false } })

      assert.isTrue((await collection.findOneAsync(id)).called)
    })

    it('async - direct - updateAsync', async () => {
      const collection = new Mongo.Collection(null)

      collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update']((userId, doc, fieldNames, modifier) => {
        modifier.$set.called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.direct.updateAsync(id, { $set: { test: false } })

      assert.isFalse(!!(await collection.findOneAsync(id)).called)
    })

    it('async - before - removeAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](() => {
        called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.removeAsync(id)

      assert.isTrue(called)
    })

    it('async - direct - removeAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.before[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](() => {
        called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.direct.removeAsync(id)

      assert.isFalse(called)
    })

    it('async - before - upsertAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.before[Meteor.isFibersDisabled ? 'upsertAsync' : 'upsert'](() => {
        called = true
      })

      await collection.upsertAsync({ test: true }, { $set: { name: 'Test' } })

      assert.isTrue(called)
    })

    it('async - direct - upsertAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.before[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](() => {
        called = true
      })

      await collection.direct[Meteor.isFibersDisabled ? 'upsertAsync' : 'upsert']({ test: true }, { $set: { name: 'Test' } })

      assert.isFalse(called)
    })

    // After

    it('async - after - insertAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.after[Meteor.isFibersDisabled ? 'insertAsync' : 'insert'](() => {
        called = true
      })

      await collection.insertAsync({ test: true })

      assert.isTrue(called)
    })

    it('async - after - findOneAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.after[Meteor.isFibersDisabled ? 'findOneAsync' : 'findOne'](() => {
        called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.findOneAsync(id)

      assert.isTrue(called)
    })

    it('async - after - findAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      // eslint-disable-next-line array-callback-return
      collection.after.find(() => {
        called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.find(id).fetchAsync()

      assert.isTrue(called)
    })

    it('async - after - updateAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.after[Meteor.isFibersDisabled ? 'updateAsync' : 'update'](() => {
        called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.updateAsync(id, { $set: { test: false } })

      assert.isTrue(called)
    })

    it('async - after - removeAsync', async () => {
      const collection = new Mongo.Collection(null)

      let called = false

      collection.after[Meteor.isFibersDisabled ? 'removeAsync' : 'remove'](() => {
        called = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.removeAsync(id)

      assert.isTrue(called)
    })
  })
}
