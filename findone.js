import { CollectionHooks } from './collection-hooks'
import { Meteor } from 'meteor/meteor'

function findOneFn (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)
  let abort

  // before
  if (!suppressAspects) {
    aspects.before.forEach((o) => {
      let r = o.aspect.call(ctx, userId, selector, options)
      r = CollectionHooks.normalizeResult(r)
      if (r === false) abort = true
    })

    if (abort) return
  }

  function after (doc) {
    if (!suppressAspects) {
      aspects.after.forEach((o) => {
        CollectionHooks.normalizeResult(o.aspect.call(ctx, userId, selector, options, doc))
      })
    }
  }

  const ret = _super.call(this, selector, options)
  after(ret)

  return ret
}

async function findOneFnAsync (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)
  let abort

  // before
  if (!suppressAspects) {
    for (let i = 0; i < aspects.before.length; i++) {
      const o = aspects.before[i]
      const r = await o.aspect.call(ctx, userId, selector, options)
      if (r === false) abort = true
    }
    if (abort) return
  }

  async function after (doc) {
    if (!suppressAspects) {
      for (let i = 0; i < aspects.after.length; i++) {
        const o = aspects.after[i]
        await o.aspect.call(ctx, userId, selector, options, doc)
      }
    }
  }

  const ret = await _super.call(this, selector, options)
  await after(ret)

  return ret
}

if (!Meteor.isFibersDisabled) {
  CollectionHooks.defineAdvice('findOne', findOneFn)
} else {
  CollectionHooks.defineAdvice('findOne', findOneFn)
  CollectionHooks.defineAdvice('findOneAsync', findOneFnAsync)
}
