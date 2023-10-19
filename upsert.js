import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'
import { Meteor } from 'meteor/meteor'

const isEmpty = a => !Array.isArray(a) || !a.length

function fnUpsert (userId, _super, instance, aspectGroup, getTransform, args, suppressAspects) {
  args[0] = CollectionHooks.normalizeSelector(instance._getFindSelector(args))

  const ctx = { context: this, _super, args }
  let [selector, mutator, options, callback] = args
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  const async = typeof callback === 'function'
  let docs
  let docIds
  let abort
  const prev = {}

  if (!suppressAspects) {
    if (!isEmpty(aspectGroup.upsert.before) || !isEmpty(aspectGroup.update.after)) {
      docs = CollectionHooks.getDocs.call(this, instance, selector, options).fetch()
      docIds = docs.map(doc => doc._id)
    }

    // copy originals for convenience for the 'after' pointcut
    if (!isEmpty(aspectGroup.update.after)) {
      if (aspectGroup.update.after.some(o => o.options.fetchPrevious !== false) &&
        CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchPrevious !== false) {
        prev.mutator = EJSON.clone(mutator)
        prev.options = EJSON.clone(options)

        prev.docs = {}
        docs.forEach((doc) => {
          prev.docs[doc._id] = EJSON.clone(doc)
        })
      }
    }

    // before
    aspectGroup.upsert.before.forEach((o) => {
      let r = o.aspect.call(ctx, userId, selector, mutator, options)
      r = CollectionHooks.normalizeResult(r)
      if (r === false) abort = true
    })

    if (abort) return { numberAffected: 0 }
  }

  const afterUpdate = (affected, err) => {
    if (!suppressAspects && !isEmpty(aspectGroup.update.after)) {
      const fields = CollectionHooks.getFields(mutator)
      const docs = CollectionHooks.getDocs.call(this, instance, { _id: { $in: docIds } }, options).fetch()

      aspectGroup.update.after.forEach((o) => {
        docs.forEach((doc) => {
          CollectionHooks.normalizeResult(o.aspect.call({
            transform: getTransform(doc),
            previous: prev.docs && prev.docs[doc._id],
            affected,
            err,
            ...ctx
          }, userId, doc, fields, prev.mutator, prev.options))
        })
      })
    }
  }

  const afterInsert = (_id, err) => {
    if (!suppressAspects && !isEmpty(aspectGroup.insert.after)) {
      const doc = CollectionHooks.getDocs.call(this, instance, { _id }, selector, {}).fetch()[0] // 3rd argument passes empty object which causes magic logic to imply limit:1
      const lctx = { transform: getTransform(doc), _id, err, ...ctx }

      aspectGroup.insert.after.forEach((o) => {
        CollectionHooks.normalizeResult(o.aspect.call(lctx, userId, doc))
      })
    }
  }

  if (async) {
    const wrappedCallback = function (err, ret) {
      if (err || (ret && ret.insertedId)) {
        // Send any errors to afterInsert
        afterInsert(ret.insertedId, err)
      } else {
        afterUpdate(ret && ret.numberAffected, err) // Note that err can never reach here
      }

      return CollectionHooks.hookedOp(function () {
        return callback.call(this, err, ret)
      })
    }

    return CollectionHooks.directOp(() => _super.call(this, selector, mutator, options, wrappedCallback))
  } else {
    const ret = CollectionHooks.directOp(() => _super.call(this, selector, mutator, options, callback))

    if (ret && ret.insertedId) {
      afterInsert(ret.insertedId)
    } else {
      afterUpdate(ret && ret.numberAffected)
    }

    return ret
  }
}

async function fnUpsertAsync (userId, _super, instance, aspectGroup, getTransform, args, suppressAspects) {
  args[0] = CollectionHooks.normalizeSelector(instance._getFindSelector(args))

  const ctx = { context: this, _super, args }
  let [selector, mutator, options, callback] = args
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  const async = typeof callback === 'function'
  let docs
  let docIds
  let abort
  const prev = {}

  if (!suppressAspects) {
    if (!isEmpty(aspectGroup.upsertAsync.before) || !isEmpty(aspectGroup.updateAsync.after)) {
      docs = await CollectionHooks.getDocs.call(this, instance, selector, options).fetch()
      docIds = docs.map(doc => doc._id)
    }

    // copy originals for convenience for the 'after' pointcut
    if (!isEmpty(aspectGroup.updateAsync.after)) {
      if (aspectGroup.updateAsync.after.some(o => o.options.fetchPrevious !== false) &&
        CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'updateAsync').fetchPrevious !== false) {
        prev.mutator = EJSON.clone(mutator)
        prev.options = EJSON.clone(options)

        prev.docs = {}
        docs.forEach((doc) => {
          prev.docs[doc._id] = EJSON.clone(doc)
        })
      }
    }

    // before
    for (let i = 0; i < aspectGroup.upsertAsync.before.length; i++) {
      const o = aspectGroup.upsertAsync.before[i]
      const r = await o.aspect.call(ctx, userId, selector, mutator, options)
      if (r === false) abort = true
    }

    if (abort) return { numberAffected: 0 }
  }

  const afterUpdate = async (affected, err) => {
    if (!suppressAspects && !isEmpty(aspectGroup.updateAsync.after)) {
      const fields = CollectionHooks.getFields(mutator)
      const docs = CollectionHooks.getDocs.call(this, instance, { _id: { $in: docIds } }, options).fetch()

      for (let i = 0; i < aspectGroup.updateAsync.after.length; i++) {
        const o = aspectGroup.updateAsync.after[i]
        for (let j = 0; j < docs.length; j++) {
          const doc = docs[j]
          await o.aspect.call({
            transform: getTransform(doc),
            previous: prev.docs && prev.docs[doc._id],
            affected,
            err,
            ...ctx
          }, userId, doc, fields, prev.mutator, prev.options)
        }
      }
    }
  }

  const afterInsert = async (_id, err) => {
    if (!suppressAspects && !isEmpty(aspectGroup.insertAsync.after)) {
      const doc = await CollectionHooks.getDocs.call(this, instance, { _id }, selector, {}).fetch()[0] // 3rd argument passes empty object which causes magic logic to imply limit:1
      const lctx = { transform: getTransform(doc), _id, err, ...ctx }

      await aspectGroup.insertAsync.after.forEach((o) => {
        o.aspect.call(lctx, userId, doc)
      })
    }
  }

  if (async) {
    const wrappedCallback = async function (err, ret) {
      if (err || (ret && ret.insertedId)) {
        // Send any errors to afterInsert
        await afterInsert(ret.insertedId, err)
      } else {
        await afterUpdate(ret && ret.numberAffected, err) // Note that err can never reach here
      }

      return CollectionHooks.hookedOp(function () {
        return callback.call(this, err, ret)
      })
    }

    return CollectionHooks.directOp(() => _super.call(this, selector, mutator, options, wrappedCallback))
  } else {
    const ret = await CollectionHooks.directOp(() => _super.call(this, selector, mutator, options, callback))

    if (ret && ret.insertedId) {
      await afterInsert(ret.insertedId)
    } else {
      await afterUpdate(ret && ret.numberAffected)
    }

    return ret
  }
}

if (!Meteor.isFibersDisabled) {
  CollectionHooks.defineAdvice('upsert', fnUpsert)
} else {
  CollectionHooks.defineAdvice('upsert', fnUpsert)
  CollectionHooks.defineAdvice('upsertAsync', fnUpsertAsync)
}
