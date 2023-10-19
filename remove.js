import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'
import { Meteor } from 'meteor/meteor'

const isEmpty = a => !Array.isArray(a) || !a.length

function removeFn (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  const [selector, callback] = args
  const async = typeof callback === 'function'
  let docs
  let abort
  const prev = []

  if (!suppressAspects) {
    try {
      if (!isEmpty(aspects.before) || !isEmpty(aspects.after)) {
        docs = CollectionHooks.getDocs.call(this, instance, selector).fetch()
      }

      // copy originals for convenience for the 'after' pointcut
      if (!isEmpty(aspects.after)) {
        docs.forEach(doc => prev.push(EJSON.clone(doc)))
      }

      // before
      aspects.before.forEach((o) => {
        docs.forEach((doc) => {
          let r = o.aspect.call({ transform: getTransform(doc), ...ctx }, userId, doc)
          r = CollectionHooks.normalizeResult(r)
          if (r === false) abort = true
        })
      })

      if (abort) return 0
    } catch (e) {
      if (async) return callback.call(this, e)
      throw e
    }
  }

  function after (err) {
    if (!suppressAspects) {
      aspects.after.forEach((o) => {
        prev.forEach((doc) => {
          CollectionHooks.normalizeResult(o.aspect.call({ transform: getTransform(doc), err, ...ctx }, userId, doc))
        })
      })
    }
  }

  if (async) {
    const wrappedCallback = function (err, ...args) {
      after(err)
      return callback.call(this, err, ...args)
    }
    return _super.call(this, selector, wrappedCallback)
  } else {
    const result = _super.call(this, selector, callback)
    after()
    return result
  }
}

async function removeFnAsync (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  const [selector, callback] = args
  const async = typeof callback === 'function'
  let docs
  let abort
  const prev = []

  if (!suppressAspects) {
    try {
      if (!isEmpty(aspects.before) || !isEmpty(aspects.after)) {
        docs = await CollectionHooks.getDocs.call(this, instance, selector).fetchAsync()
      }

      // copy originals for convenience for the 'after' pointcut
      if (!isEmpty(aspects.after)) {
        docs.forEach(doc => prev.push(EJSON.clone(doc)))
      }

      // before
      for (let i = 0; i < aspects.before.length; i++) {
        for (let j = 0; j < docs.length; j++) {
          const o = aspects.before[i]
          const r = await o.aspect.call({ transform: await getTransform(docs[j]), ...ctx }, userId, docs[j])
          if (r === false) abort = true
        }
      }

      if (abort) return 0
    } catch (e) {
      if (async) return callback.call(this, e)
      throw e
    }
  }

  async function after (err) {
    if (!suppressAspects) {
      for (let i = 0; i < aspects.after.length; i++) {
        for (let j = 0; j < prev.length; j++) {
          const o = aspects.after[i]
          await o.aspect.call({ transform: await getTransform(prev[j]), err, ...ctx }, userId, prev[j])
        }
      }
    }
  }

  if (async) {
    const wrappedCallback = function (err, ...args) {
      after(err)
      return callback.call(this, err, ...args)
    }
    return await _super.call(this, selector, wrappedCallback)
  } else {
    const result = await _super.call(this, selector, callback)
    await after()
    return result
  }
}

if (!Meteor.isFibersDisabled) {
  CollectionHooks.defineAdvice('remove', removeFn)
} else {
  CollectionHooks.defineAdvice('remove', removeFn)
  CollectionHooks.defineAdvice('removeAsync', removeFnAsync)
}
