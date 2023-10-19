import { EJSON } from 'meteor/ejson'
import { Mongo } from 'meteor/mongo'
import { Meteor } from 'meteor/meteor'
import { CollectionHooks } from './collection-hooks'

const insertFn = function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  let doc = args[0]
  let callback
  if (typeof args[args.length - 1] === 'function') {
    callback = args[args.length - 1]
  }

  const async = typeof callback === 'function'
  let abort
  let ret

  // before
  if (!suppressAspects) {
    try {
      aspects.before.forEach((o) => {
        let r = o.aspect.call({ transform: getTransform(doc), ...ctx }, userId, doc)
        r = CollectionHooks.normalizeResult(r)
        if (r === false) abort = true
      })

      if (abort) return
    } catch (e) {
      if (async) return callback.call(this, e)
      throw e
    }
  }

  const after = (id, err) => {
    if (id) {
      // In some cases (namely Meteor.users on Meteor 1.4+), the _id property
      // is a raw mongo _id object. We need to extract the _id from this object
      if (typeof id === 'object' && id.ops) {
        // If _str then collection is using Mongo.ObjectID as ids
        if (doc._id._str) {
          id = new Mongo.ObjectID(doc._id._str.toString())
        } else {
          id = id.ops && id.ops[0] && id.ops[0]._id
        }
      }
      doc = EJSON.clone(doc)
      doc._id = id
    }
    if (!suppressAspects) {
      const lctx = { transform: getTransform(doc), _id: id, err, ...ctx }
      aspects.after.forEach((o) => {
        CollectionHooks.normalizeResult(o.aspect.call(lctx, userId, doc))
      })
    }
    return id
  }

  if (async) {
    const wrappedCallback = function (err, obj, ...args) {
      after((obj && obj[0] && obj[0]._id) || obj, err)
      return callback.call(this, err, obj, ...args)
    }
    return _super.call(this, doc, wrappedCallback)
  } else {
    ret = _super.call(this, doc, callback)
    return after((ret && ret.insertedId) || (ret && ret[0] && ret[0]._id) || ret)
  }
}

const insertFnAsync = async function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  let doc = args[0]
  let callback
  if (typeof args[args.length - 1] === 'function') {
    callback = args[args.length - 1]
  }

  const async = typeof callback === 'function'
  let abort
  let ret

  // before
  if (!suppressAspects) {
    try {
      for (let i = 0; i < aspects.before.length; i++) {
        const o = aspects.before[i]
        const r = await o.aspect.call({ transform: getTransform(doc), ...ctx }, userId, doc)
        if (r === false) abort = true
      }

      if (abort) return
    } catch (e) {
      if (async) return callback.call(this, e)
      throw e
    }
  }

  const after = async (id, err) => {
    if (id) {
      // In some cases (namely Meteor.users on Meteor 1.4+), the _id property
      // is a raw mongo _id object. We need to extract the _id from this object
      if (typeof id === 'object' && id.ops) {
        // If _str then collection is using Mongo.ObjectID as ids
        if (doc._id._str) {
          id = new Mongo.ObjectID(doc._id._str.toString())
        } else {
          id = id.ops && id.ops[0] && id.ops[0]._id
        }
      }
      doc = EJSON.clone(doc)
      doc._id = id
    }
    if (!suppressAspects) {
      const lctx = { transform: await getTransform(doc), _id: id, err, ...ctx }
      for (let i = 0; i < aspects.after.length; i++) {
        const o = aspects.after[i]
        await o.aspect.call(lctx, userId, doc)
      }
    }
    return id
  }

  if (async) {
    const wrappedCallback = function (err, obj, ...args) {
      after((obj && obj[0] && obj[0]._id) || obj, err)
      return callback.call(this, err, obj, ...args)
    }
    return await _super.call(this, doc, wrappedCallback)
  } else {
    ret = await _super.call(this, doc, callback)
    return await after((ret && ret.insertedId) || (ret && ret[0] && ret[0]._id) || ret)
  }
}

if (!Meteor.isFibersDisabled) {
  CollectionHooks.defineAdvice('insert', insertFn)
} else {
  CollectionHooks.defineAdvice('insert', insertFn)
  CollectionHooks.defineAdvice('insertAsync', insertFnAsync)
}
