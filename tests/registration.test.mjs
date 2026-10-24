import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmationStore, registrationReceipt} from '../src/registration.mjs';
import {calendar} from '../server/calendar.mjs';
import {demoEvents} from '../server/demo.mjs';

const data = {
  event: {...demoEvents[0], starts_at: '2026-11-01T18:00:00Z', ends_at: '2026-11-01T20:00:00Z'},
  cancel_token: 'synthetic-test-token',
  name: 'Private test attendee',
  email: 'private-attendee@example.com',
};

test('confirmed signup survives denied storage access and quota failures', () => {
  for (const getStorage of [
    () => { throw new Error('SecurityError'); },
    () => ({setItem() { throw new Error('QuotaExceededError'); }, getItem() { return JSON.stringify({cancel_token: 'old'}); }}),
  ]) {
    const store = createConfirmationStore(getStorage);
    assert.doesNotThrow(() => store.save(data));
    assert.equal(store.read(), data);
    const next = {...data, cancel_token: 'new-synthetic-token'};
    store.save(next);
    assert.equal(store.read(), next);
  }
});

test('confirmation can be restored after reload, while missing or corrupt storage is safe', () => {
  const values = new Map();
  const storage = {setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) ?? null};
  assert.equal(createConfirmationStore(() => storage).read(), null);
  createConfirmationStore(() => storage).save(data);
  assert.deepEqual(createConfirmationStore(() => storage).read(), data);
  storage.setItem('registration-confirmation', 'broken JSON');
  assert.equal(createConfirmationStore(() => storage).read(), null);
  assert.equal(createConfirmationStore(() => { throw new Error('SecurityError'); }).read(), null);
});

test('private receipt preserves cancellation access and Pacific dates without exporting attendee details', () => {
  const receipt = registrationReceipt(data, 'https://example.com');
  assert.ok(receipt.includes('Sunday, November 1, 2026 at 10:00 AM (Pacific time)'));
  assert.ok(receipt.includes('Sunday, November 1, 2026 at 12:00 PM (Pacific time)'));
  assert.ok(receipt.includes(`https://example.com/events/${data.event.id}`));
  const link = receipt.split('Private cancellation link: ')[1].split('\n')[0];
  const url = new URL(link);
  assert.equal(url.pathname, '/cancel');
  assert.equal(url.search, '');
  assert.equal(url.hash, '#synthetic-test-token');
  assert.ok(receipt.includes('Keep this file private.'));
  assert.ok(receipt.includes('No confirmation email will be sent.'));
  assert.ok(!receipt.includes(data.name));
  assert.ok(!receipt.includes(data.email));
  assert.ok(!calendar(data.event, 'https://example.com').includes(data.cancel_token));
});
