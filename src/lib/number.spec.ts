// tslint:disable:no-expression-statement
import test from 'ava'
import { double, power, triple } from './number'

test('double', t => {
  t.is(double(2), 4)
})

test('triple', t => {
  t.is(triple(2), 6)
})

test('power', t => {
  t.is(power(2, 4), 16)
})
