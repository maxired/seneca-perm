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

  si.use(require('..'), {
    accessControls: [{
      name: 'access to region attribute',
      roles: ['foobar', 'region'],
      entities: [{
        zone: undefined,
        base: undefined,
        name: 'foobar'
      }],
      control: 'filter',
      actions: ['save_new', 'save_existing', 'list', 'load', 'remove'],
      conditions: [],
      filters: {
        region: false
      }
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

  it('[load] attributes based access', function (done) {
    var psi = si.delegate({perm$: {roles: ['foobar', 'region']}})
    var psiNoRegion = si.delegate({perm$: {roles: ['foobar']}})

    var pf1 = psi.make('foobar', {region: 'EMEA'})
    var pf1NoRegion = psiNoRegion.make('foobar', {region: 'EMEA'})

    pf1.save$(function (err, pf1) {
      assert.isNull(err, err)
      assert.isNotNull(pf1.id, 'missing pf1.id')
      assert.equal(pf1.region, 'EMEA')

      pf1.load$(pf1.id, function (err, pf1) {
        assert.isNull(err, err)
        assert.isNotNull(pf1.id, 'missing pf1.id')
        assert.equal(pf1.region, 'EMEA')

        pf1.a = 2

        pf1.save$(function (err, pf1) {
          assert.isNull(err, err)
          assert.isNotNull(pf1.id, 'missing pf1.id')
          assert.equal(pf1.region, 'EMEA')

          ;pf1NoRegion.load$(pf1.id, function (err, pf1NoRegion) {
            assert.isNull(err, err)
            assert.isNotNull(pf1NoRegion, 'missing pf1NoRegion')
            assert.equal(pf1NoRegion.id, pf1.id)
            assert.ok(!pf1NoRegion.hasOwnProperty('region'), 'object has a region attr but it should not')

            done()
          })
        })
      })
    })
  })

  it('[load] attribute based rejection', function (done) {
    var psi = si.delegate({perm$: {roles: ['foobar']}})
    var psiRegion = si.delegate({perm$: {roles: ['foobar', 'region']}})

    var pf1 = psi.make('foobar', {region: 'EMEA'})
    var pf1Region = psiRegion.make('foobar', {region: 'EMEA'})

    pf1.save$(function (err, pf1) {
      assert.isNull(err, err)
      assert.ok(pf1)
      assert.ok(pf1.id)
      assert.ok(!pf1.hasOwnProperty('region'), 'regionless user should not be able to save a region attr')

      pf1Region.load$(pf1.id, function (err, pf1Region) {
        assert.isNull(err, err)
        assert.ok(pf1)
        assert.ok(pf1.id)
        assert.ok(!pf1.hasOwnProperty('region'), 'Expected region attr to be removed')

        done()
      })
    })
  })

  it('[save] attributes based rejection', function (done) {
    var psi = si.delegate({perm$: {roles: ['foobar', 'region']}})
    var psiNoRegion = si.delegate({perm$: {roles: ['foobar']}})

    var pf1 = psi.make('foobar', {region: 'EMEA'})

    pf1.save$(function (err, pf1) {
      assert.isNull(err, err)
      assert.isNotNull(pf1.id)
      assert.equal(pf1.region, 'EMEA')

      ;pf1.load$(pf1.id, function (err, pf1) {
        assert.isNull(err, err)
        assert.isNotNull(pf1.id)
        assert.equal(pf1.region, 'EMEA')

        var pf1NoRegion = psiNoRegion.make('foobar', {id: pf1.id, region: 'APAC', updated: true})

        pf1NoRegion.save$(function (err, pf1NoRegion) {
          assert.isNull(err, err)
          assert.isNotNull(pf1NoRegion)
          assert.equal(pf1NoRegion.id, pf1.id)
          assert.ok(pf1NoRegion.updated)

          ;pf1.load$(pf1.id, function (err, loadedPf1) {
            assert.isNull(err, err)
            assert.equal(loadedPf1.id, pf1.id)
            assert.equal(loadedPf1.region, 'EMEA')
            assert.ok(loadedPf1.updated)

            done()
          })
        })
      })
    })
  })
})
