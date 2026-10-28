import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidUrl, normalizeUrl } from '../../utils/urls';

test('links without https:// or www. are valid and get https://', () => {
  assert.equal(isValidUrl('youtube.com/watch?v=abc'), true);
  assert.equal(isValidUrl('www.instagram.com/p/xyz'), true);
  assert.equal(isValidUrl('https://vimeo.com/123'), true);
  assert.equal(normalizeUrl(' youtube.com/watch?v=abc '), 'https://youtube.com/watch?v=abc');
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com');
});

test('non-links and unsafe schemes are rejected', () => {
  assert.equal(isValidUrl('not a link'), false);
  assert.equal(isValidUrl('javascript:alert(1)'), false);
  assert.equal(isValidUrl('data:text/html,hi'), false);
  assert.equal(isValidUrl('localhost'), false);
});
