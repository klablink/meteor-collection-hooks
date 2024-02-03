/* eslint-disable no-native-reassign, no-global-assign */

export const InsecureLogin = {
  queue: [],
  ran: false,
  async ready (callback) {
    return new Promise((resolve) => {
      const tmr = setInterval(() => {
        if (this.ran) {
          clearInterval(tmr)
          resolve()
        }
      })
    }, 2)
  },
  async run () {
    this.ran = true
  }
}
