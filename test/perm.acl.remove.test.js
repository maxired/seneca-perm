/* Copyright (c) 2013-2014 Richard Rodger */
'use strict'

var Lab = require('lab')
var Seneca = require('seneca')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

var assert = require('chai').assert

describe('perm acl', function () {
  var si = Seneca()

  si.use('..', {
    accessControls: [{
      name: 'can delete foobar',
      roles: ['foobar'],
      entities: [{
        zone: undefined,
        base: undefined,
        name: 'foobar'
      }],
      control: 'required',
      actions: ['remove'],
      conditions: []
    }],
    allowedProperties: [{
      entity: {
        zone: undefined,
        base: undefined,
        name: 'item'
      },
      fields: ['id', 'name', 'number']
    }]
  })

  it('seneca ready', function (done) {
    si.ready(done)
  })

  it('remove granted', function (done) {
    var psi = si.delegate({perm$: {roles: ['foobar']}})

    var pf1 = psi.make('foobar', {region: 'EMEA'})

    pf1.save$(function (err, pf1) {
      assert.isNull(err, err)
      assert.isNotNull(pf1.id, 'missing pf1.id')
      assert.equal(pf1.region, 'EMEA')

      ;pf1.load$(pf1.id, function (err, pf1) {
        assert.isNull(err, err)
        assert.isNotNull(pf1.id, 'missing pf1.id')
        assert.equal(pf1.region, 'EMEA')

        ;pf1.remove$({ id: pf1.id }, function (err, pf1) {
          assert.isNull(err, err)
          assert.isNotNull(pf1.id, 'missing pf1.id')
          assert.equal(pf1.region, 'EMEA')
          done()
        })
      })
    })
  })

  it('remove denied', function (done) {
    var psi = si.delegate({perm$: {roles: ['foobar']}})
    var psiNoRemove = si.delegate({perm$: {roles: []}})

    var pf1 = psi.make('foobar', {region: 'EMEA'})
    var pf1NoRemove = psiNoRemove.make('foobar')

    pf1.save$(function (err, pf1) {
      assert.isNull(err, err)
      assert.isNotNull(pf1.id, 'missing pf1.id')
      assert.equal(pf1.region, 'EMEA')

      ;pf1.load$(pf1.id, function (err, pf1) {
        assert.isNull(err, err)
        assert.isNotNull(pf1.id, 'missing pf1.id')
        assert.equal(pf1.region, 'EMEA')

        ;pf1NoRemove.remove$({ id: pf1.id }, function (err, pf1) {
          assert.isNotNull(err, 'expected access denied error')
          done()
        })
      })
    })
  })
})
