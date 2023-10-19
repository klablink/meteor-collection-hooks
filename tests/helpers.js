export function repeat (fn, times = 10) {
  function handler (res, interval, resolve, reject) {
    if (res instanceof Error) {
      clearInterval(interval)
      reject(res)
    } else if (res !== undefined && res !== false) {
      clearInterval(interval)
      resolve(res)
    }
  }

  return new Promise((resolve, reject) => {
    let count = 0
    const interval = setInterval(() => {
      const res = fn()
      if (res && res.then && res.catch) {
        res.then((res) => {
          handler(res, interval, resolve, reject)
        }).catch((err) => {
          handler(err, interval, resolve, reject)
        })
      } else {
        handler(res, interval, resolve, reject)
      }

      count++

      if (count > times) {
        clearInterval(interval)
        reject(new Error('Timeout'))
      }
    }, 100)
  })
}

export function wait (ms = 100) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
