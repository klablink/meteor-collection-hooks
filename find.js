import { CollectionHooks } from './collection-hooks';

function callOnce(fn) {
  let called = false;
  return function () {
    if (called) {
      return;
    }
    called = true;
    return fn.apply(this, arguments);
  };
}

const errorFindAsync = callOnce(() => {
  console.error('Collection hooks warning: You are using a asynchronous find hook.');
});

const findFn = function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = {
    context: this,
    _super,
    args
  };
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args));
  const options = instance._getFindOptions(args);
  let abort;
  // before
  if (!suppressAspects) {
    aspects.before.forEach((o) => {
      let r = o.aspect.call(ctx, userId, selector, options);
      if (r && r.then && r.catch && typeof r.then === 'function' && typeof r.catch === 'function') {
        errorFindAsync();
      }
      r = CollectionHooks.normalizeResult(r);
      if (r === false) {
        abort = true;
      }
    });

    if (abort) {
      return instance.find(undefined);
    }
  }

  const after = (cursor) => {
    if (!suppressAspects) {
      aspects.after.forEach((o) => {
        CollectionHooks.normalizeResult(o.aspect.call(ctx, userId, selector, options, cursor));
      });
    }
  };

  const ret = _super.call(this, selector, options);
  after(ret);

  return ret;
};

CollectionHooks.defineAdvice('find', findFn)
