/* Copyright (c) 2013-2014 Richard Rodger */
'use strict'

var Lab = require('lab')
var Seneca = require('seneca')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

var assert = require('chai').assert

describe('perm', function () {
  it('allow', function (fin) {
    var si = Seneca({strict: {result: false}})

    si.add({a: 1, b: 2}, function (args, done) {
      done(null, '' + args.a + args.b + args.c)
    })

    si.use('..', {act: [
        {a: 1, b: 2},
        {a: 1, b: 2, d: 4}
    ]})

    si.ready(function () {
      si.act('a:1,b:2,c:3', function (err, out) {
        assert.ok(err == null)
        assert.equal('123', out)

        si.act('a:1,b:2,c:3', {perm$: {allow: true}}, function (err, out) {
          assert.isNull(err)
          assert.equal('123', out)

          si.act('a:1,b:2,c:3', {perm$: {allow: false}}, function (err, out) {
            assert.isNotNull(err)
            assert.equal('perm/fail/allow', err.seneca.code)

            si.act('a:1,b:2,c:3,d:4', function (err, out) {
              assert.isNull(err)
              assert.equal('123', out)

              si.act('a:1,b:2,c:3,d:4', {perm$: {allow: true}}, function (err, out) {
                assert.isNull(err)
                assert.equal('123', out)

                si.act('a:1,b:2,c:3,d:4', {perm$: {allow: false}}, function (err, out) {
                  assert.isNotNull(err)
                  assert.equal('perm/fail/allow', err.seneca.code)

                  var act = si.util.router()

                  act.add({a: 1, b: 2}, true)

                  si.act('a:1,b:2,c:3', {perm$: {act: act}}, function (err, out) {
                    assert.isNull(err)
                    assert.equal('123', out)

                    fin()
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  it('entity', function (fin) {
    var si = Seneca()

    si.use('..', {
      entity: [
        {name: 'foo'},
        'bar'
      ]
    })

    si.ready(function () {
      var entity = si.util.router()
      entity.add({name: 'foo'}, 'cr')
      entity.add({name: 'bar'}, 'rq')

      si.make('bar', {b: 2}).save$()

      var psi = si.delegate({perm$: {entity: entity}})
      var pf1 = psi.make('foo', {a: 1})
      var pb1 = psi.make('bar')

      pf1.save$(function (err, pf1) {
        assert.isNull(err)
        assert.isNotNull(pf1.id)
        assert.equal(1, pf1.a)

        pf1.load$(pf1.id, function (err, pf1) {
          assert.isNull(err)
          assert.isNotNull(pf1.id)
          assert.equal(1, pf1.a)

          pf1.a = 2
          pf1.save$(function (err, pf1) {
            assert.isNotNull(err)
            assert.equal('cr', err.seneca.valmap.allowed)
            assert.equal('u', err.seneca.valmap.need)

            pb1.list$({b: 2}, function (err, list) {
              assert.isNull(err)
              assert.equal(2, list[0].b)

              fin()
            }) }) }) })
    })
  })

  // TODO: test all ent cmds

  it('entity-boolean', function (fin) {
    var si = Seneca()

    si.use('..', {
      // apply perm check to all entities
      entity: true
    })

    si.ready(function () {
      var entity = si.util.router()
      entity.add({name: 'bar'}, 'rq')

      si.make('foo', {a: 1}).save$()
      si.make('bar', {b: 2}).save$()

      var psi = si.delegate({perm$: {entity: entity}})

      var pf1 = psi.make('foo')
      var pb1 = psi.make('bar')

      pf1.list$({a: 1}, function (err, list) {
        assert.isNotNull(err)
        assert.equal(null, err.seneca.valmap.allowed)
        assert.equal('q', err.seneca.valmap.need)

        pb1.list$({b: 2}, function (err, list) {
          assert.isNull(err)
          assert.equal(2, list[0].b)

          fin()
        }) })
    })
  })

  it('owner', function (fin) {
    var si = Seneca()

    si.use('..', {
      own: [
        {name: 'foo'}
      ]
    })

    si.ready(function () {
      var entity = si.util.router()
      entity.add({name: 'foo'}, 'crudq')

      var os1 = si.delegate({perm$: {own: {entity: entity, owner: 'o1'}}})
      var f1 = os1.make('foo')
      f1.a = 1
      f1.save$(function (err, f1) {
        assert.isNull(err)
        assert.equal(1, f1.a)
        assert.equal('o1', f1.owner)

        f1.load$(f1.id, function (err, f1) {
          assert.isNull(err)
          assert.isNotNull(f1.id)
          assert.equal(1, f1.a)
          assert.equal('o1', f1.owner)

          var os2 = si.delegate({perm$: {own: {entity: entity, owner: 'o2'}}})
          var f2 = os2.make('foo')

          f2.load$(f1.id, function (err, f2o) {
            assert.isNotNull(err)
            assert.equal('perm/fail/own', err.seneca.code)
            assert.equal('o2', err.seneca.valmap.owner)
            // console.log(err)

            fin()
          })
        })
      })
    })
  })

  it('makeperm', function (fin) {
    var si = Seneca({strict: {result: false}})

    si.use('..', {
      act: [
        {a: 1},
        {b: 2}
      ]
    })

    si.add({a: 1}, function (args, done) { done(null, '' + args.a + args.c) })
    si.add({b: 2}, function (args, done) { done(null, '' + args.b + args.c) })

    si.ready(function () {
      si.act('role:perm,cmd:makeperm', {perm: {act: [
            {a: 1, perm$: true}
      ]}}, function (err, perm) {
        assert.isNull(err)

        si.act('a:1,c:3', {perm$: perm}, function (err, out) {
          assert.isNull(err)
          assert.equal('13', out)

          si.act('b:2,c:3', {perm$: perm}, function (err, out) {
            assert.isNotNull(err)
            assert.equal('perm/fail/act', err.seneca.code)

            fin()
          })
        })
      })
    })
  })
})
