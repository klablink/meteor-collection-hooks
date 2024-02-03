import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { EJSON } from 'meteor/ejson'
import { LocalCollection } from 'meteor/minimongo'

// Relevant AOP terminology:
// Aspect: User code that runs before/after (hook)
// Advice: Wrapper code that knows when to call user code (aspects)
// Pointcut: before/after
const advices = {}

let EnvironmentVariable
if(Meteor.isServer) {
  const { AsyncLocalStorage } = require('node:async_hooks');

  EnvironmentVariable = class EnvironmentVariable {
    constructor() {
      this.context = new AsyncLocalStorage();
    }

    get() {
      return this.context.getStore();
    }

    withValue(value, fn) {
      return this.context.run(value, () => fn());
    }
  }
} else {
  EnvironmentVariable = Meteor.EnvironmentVariable
}

export const CollectionHooks = {
  defaults: {
    before: {
      insert: {},
      update: {},
      remove: {},
      upsert: {},
      insertAsync: {},
      updateAsync: {},
      removeAsync: {},
      upsertAsync: {},
      find: {},
      findOne: {},
      findOneAsync: {},
      all: {}
    },
    after: {
      insert: {},
      update: {},
      remove: {},
      find: {},
      findOne: {},
      insertAsync: {},
      updateAsync: {},
      removeAsync: {},
      upsertAsync: {},
      findOneAsync: {},
      all: {}
    },
    all: {
      insert: {},
      update: {},
      remove: {},
      find: {},
      findOne: {},
      insertAsync: {},
      updateAsync: {},
      removeAsync: {},
      upsertAsync: {},
      findOneAsync: {},
      all: {}
    }
  },
  directEnv: new EnvironmentVariable(),
  directOp (func) {
    return this.directEnv.withValue(true, func)
  },
  hookedOp (func) {
    return this.directEnv.withValue(false, func)
  }
}

CollectionHooks.extendCollectionInstance = function extendCollectionInstance (self, constructor) {
  // Offer a public API to allow the user to define aspects
  // Example: collection.before.insert(func);
  ['before', 'after'].forEach(function (pointcut) {
    Object.entries(advices).forEach(function ([method, advice]) {
      if (['upsert', 'upsertAsync'].includes(advice) && pointcut === 'after') return

      Meteor._ensure(self, pointcut, method)
      Meteor._ensure(self, '_hookAspects', method)

      self._hookAspects[method][pointcut] = []
      self[pointcut][method] = function (aspect, options) {
        let target = {
          aspect,
          options: CollectionHooks.initOptions(options, pointcut, method)
        }
        // adding is simply pushing it to the array
        self._hookAspects[method][pointcut].push(target)

        return {
          replace (aspect, options) {
            // replacing is done by determining the actual index of a given target
            // and replace this with the new one
            const src = self._hookAspects[method][pointcut]
            const targetIndex = src.findIndex(entry => entry === target)
            const newTarget = {
              aspect,
              options: CollectionHooks.initOptions(options, pointcut, method)
            }
            src.splice(targetIndex, 1, newTarget)
            // update the target to get the correct index in future calls
            target = newTarget
          },
          remove () {
            // removing a hook is done by determining the actual index of a given target
            // and removing it form the source array
            const src = self._hookAspects[method][pointcut]
            const targetIndex = src.findIndex(entry => entry === target)
            self._hookAspects[method][pointcut].splice(targetIndex, 1)
          }
        }
      }
    })
  })

  // Offer a publicly accessible object to allow the user to define
  // collection-wide hook options.
  // Example: collection.hookOptions.after.update = {fetchPrevious: false};
  self.hookOptions = EJSON.clone(CollectionHooks.defaults)

  // Wrap mutator methods, letting the defined advice do the work
  Object.entries(advices).forEach(function ([method, advice]) {
    const isAsync = method.endsWith('Async')
    const collection = Meteor.isClient || ['upsert', 'upsertAsync'].includes(method) ? self : self._collection

    // Store a reference to the original mutator method
    const _super = collection[method]

    Meteor._ensure(self, 'direct', method)
    self.direct[method] = function (...args) {
      if (method === 'find') {
        return _super.apply(collection, args)
      } else {
        const res = CollectionHooks.directOp(function () {
          return constructor.prototype[method].apply(self, args)
        })

        return isAsync && !Meteor.isFibersDisabled ? Promise.resolve(res) : res
      }
    }

    const asyncMethod = method + 'Async'

    if (constructor.prototype[asyncMethod]) {
      self.direct[asyncMethod] = function (...args) {
        const res = CollectionHooks.directOp(function () {
          return constructor.prototype[asyncMethod].apply(self, args)
        })

        return !Meteor.isFibersDisabled ? Promise.resolve(res) : res
      }
    }

    collection[method] = function (...args) {
      if (CollectionHooks.directEnv.get() === true) {
        return _super.apply(collection, args)
      }

      // NOTE: should we decide to force `update` with `{upsert:true}` to use
      // the `upsert` hooks, this is what will accomplish it. It's important to
      // realize that Meteor won't distinguish between an `update` and an
      // `insert` though, so we'll end up with `after.update` getting called
      // even on an `insert`. That's why we've chosen to disable this for now.
      // if (method === "update" && Object(args[2]) === args[2] && args[2].upsert) {
      //   method = "upsert";
      //   advice = CollectionHooks.getAdvice(method);
      // }

      const getHooks = (method) => {
        if (['upsert', 'upsertAsync'].includes(method)) {
          return {
            insert: self._hookAspects.insert || {},
            update: self._hookAspects.update || {},
            upsert: self._hookAspects.upsert || {},
            remove: self._hookAspects.remove || {},
            insertAsync: self._hookAspects.insertAsync || {},
            updateAsync: self._hookAspects.updateAsync || {},
            upsertAsync: self._hookAspects.upsertAsync || {},
            removeAsync: self._hookAspects.removeAsync || {}
          }
        } else {
          return self._hookAspects[method] || {}
        }
      }

      return advice.call(this,
        CollectionHooks.getUserId(),
        _super,
        self,
        getHooks(method),
        function (doc) {
          return (
            typeof self._transform === 'function'
              ? function (d) {
                return self._transform(d || doc)
              }
              : function (d) {
                return d || doc
              }
          )
        },
        args,
        false
      )
    }
  })
}

CollectionHooks.defineAdvice = (method, advice) => {
  advices[method] = advice
}

CollectionHooks.getAdvice = method => advices[method]

CollectionHooks.initOptions = (options, pointcut, method) =>
  CollectionHooks.extendOptions(CollectionHooks.defaults, options, pointcut, method)

CollectionHooks.extendOptions = (source, options, pointcut, method) =>
  ({ ...options, ...source.all.all, ...source[pointcut].all, ...source.all[method], ...source[pointcut][method] })

CollectionHooks.getDocs = function getDocs (collection, selector, options, fetchFields = {}, { useDirect = false } = {}) {
  const findOptions = { transform: null, reactive: false }

  if (Object.keys(fetchFields).length > 0) {
    findOptions.fields = fetchFields
  }

  /*
  // No "fetch" support at this time.
  if (!this._validators.fetchAllFields) {
    findOptions.fields = {};
    this._validators.fetch.forEach(function(fieldName) {
      findOptions.fields[fieldName] = 1;
    });
  }
  */

  // Bit of a magic condition here... only "update" passes options, so this is
  // only relevant to when update calls getDocs:
  if (options) {
    // This was added because in our case, we are potentially iterating over
    // multiple docs. If multi isn't enabled, force a limit (almost like
    // findOne), as the default for update without multi enabled is to affect
    // only the first matched document:
    if (!options.multi) {
      findOptions.limit = 1
    }
    const { multi, upsert, ...rest } = options
    Object.assign(findOptions, rest)
  }

  // Unlike validators, we iterate over multiple docs, so use
  // find instead of findOne:
  return (useDirect ? collection.direct : collection).find(selector, findOptions)
}

// This function normalizes the selector (converting it to an Object)
CollectionHooks.normalizeSelector = function (selector) {
  if (typeof selector === 'string' || (selector && selector.constructor === Mongo.ObjectID)) {
    return {
      _id: selector
    }
  } else {
    return selector
  }
}

// This function contains a snippet of code pulled and modified from:
// ~/.meteor/packages/mongo-livedata/collection.js
// It's contained in these utility functions to make updates easier for us in
// case this code changes.
CollectionHooks.getFields = function getFields (mutator) {
  // compute modified fields
  const fields = []
  // ====ADDED START=======================
  const operators = [
    '$addToSet',
    '$bit',
    '$currentDate',
    '$inc',
    '$max',
    '$min',
    '$pop',
    '$pull',
    '$pullAll',
    '$push',
    '$rename',
    '$set',
    '$unset'
  ]
  // ====ADDED END=========================

  Object.entries(mutator).forEach(function ([op, params]) {
    // ====ADDED START=======================
    if (operators.includes(op)) {
      // ====ADDED END=========================
      Object.keys(params).forEach(function (field) {
        // treat dotted fields as if they are replacing their
        // top-level part
        if (field.indexOf('.') !== -1) {
          field = field.substring(0, field.indexOf('.'))
        }

        // record the field we are trying to change
        if (!fields.includes(field)) {
          fields.push(field)
        }
      })
      // ====ADDED START=======================
    } else {
      fields.push(op)
    }
    // ====ADDED END=========================
  })

  return fields
}

CollectionHooks.reassignPrototype = function reassignPrototype (instance, constr) {
  const hasSetPrototypeOf = typeof Object.setPrototypeOf === 'function'
  constr = constr || Mongo.Collection

  // __proto__ is not available in < IE11
  // Note: Assigning a prototype dynamically has performance implications
  if (hasSetPrototypeOf) {
    Object.setPrototypeOf(instance, constr.prototype)
  } else if (instance.__proto__) { // eslint-disable-line no-proto
    instance.__proto__ = constr.prototype // eslint-disable-line no-proto
  }
}

CollectionHooks.wrapCollection = function wrapCollection (ns, as) {
  if (!as._CollectionConstructor) as._CollectionConstructor = as.Collection
  if (!as._CollectionPrototype) as._CollectionPrototype = new as.Collection(null)

  const constructor = ns._NewCollectionContructor || as._CollectionConstructor
  const proto = as._CollectionPrototype

  ns.Collection = function (...args) {
    const ret = constructor.apply(this, args)
    CollectionHooks.extendCollectionInstance(this, constructor)
    return ret
  }
  // Retain a reference to the new constructor to allow further wrapping.
  ns._NewCollectionContructor = ns.Collection

  ns.Collection.prototype = proto
  ns.Collection.prototype.constructor = ns.Collection

  for (const prop of Object.keys(constructor)) {
    ns.Collection[prop] = constructor[prop]
  }

  // Meteor overrides the apply method which is copied from the constructor in the loop above. Replace it with the
  // default method which we need if we were to further wrap ns.Collection.
  ns.Collection.apply = Function.prototype.apply
}

CollectionHooks.modify = LocalCollection._modify

CollectionHooks.normalizeResult = function (r) {
  if (r && typeof r.then === 'function') {
    if (Meteor.isClient) {
      throw new Error('insert hook must be synchronous. Use insertAsync instead.')
    }
  }
  return r
}

if (typeof Mongo !== 'undefined') {
  CollectionHooks.wrapCollection(Meteor, Mongo)
  CollectionHooks.wrapCollection(Mongo, Mongo)
} else {
  CollectionHooks.wrapCollection(Meteor, Meteor)
}
