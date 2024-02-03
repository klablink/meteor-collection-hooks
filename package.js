/* global Package */

Package.describe({
  name: 'matb33:collection-hooks',
  summary: 'Extends Mongo.Collection with before/after hooks for insert/update/upsert/remove/find/findOne',
  version: '1.3.2',
  git: 'https://github.com/Meteor-Community-Packages/meteor-collection-hooks'
})

Package.onUse(function (api) {
  api.versionsFrom(['2.3', '2.8.1', '3.0-rc.10'])

  api.use([
    'mongo',
    'tracker',
    'ejson',
    'minimongo',
    'ecmascript'
  ])

  api.use('zodern:types@1.0.13', 'server')

  api.use(['accounts-base'], ['client', 'server'], { weak: true })

  api.mainModule('client.js', 'client')
  api.mainModule('server.js', 'server')

  api.export('CollectionHooks')
})

Package.onTest(function (api) {
  // var isTravisCI = process && process.env && process.env.TRAVIS

  api.versionsFrom(['1.12', '2.3', '3.0-rc.10'])

  api.use([
    'matb33:collection-hooks',
    'accounts-base',
    'accounts-password',
    'mongo',
    'test-helpers',
    'ecmascript',
    'autopublish',
    'insecure',
    'meteortesting:mocha',
    'jquery'
  ])

  api.mainModule('tests/client/main.js', 'client')
  api.mainModule('tests/server/main.js', 'server')
})
