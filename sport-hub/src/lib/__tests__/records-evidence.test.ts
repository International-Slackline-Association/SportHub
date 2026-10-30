import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evidenceFileName, uploadDescription } from '../records-evidence';
import { evidenceFileProblem, formatFileSize, MAX_EVIDENCE_FILE_BYTES } from '../records-rules';

test('uploads are named after their description and keep the extension', () => {
  assert.equal(evidenceFileName('Laser measurement anchor A', 'IMG_2041.JPG'), 'Laser measurement anchor A.jpg');
  assert.equal(evidenceFileName('GPS: track / day 2?', 'run.gpx'), 'GPS track day 2.gpx');
  assert.equal(evidenceFileName('   ', 'IMG_2041.jpg'), 'IMG_2041.jpg');
  assert.equal(evidenceFileName('x'.repeat(150), 'a.mp4').length, 104);
});

test('the Drive description keeps the original file name', () => {
  assert.equal(uploadDescription(' Full video ', 'IMG_1.mov'), 'Full video\n\nOriginal file: IMG_1.mov');
});

test('evidence files are checked for type and size', () => {
  assert.equal(evidenceFileProblem('video.mp4', 1000), null);
  assert.equal(evidenceFileProblem('track.GPX', 1000), null);
  assert.match(evidenceFileProblem('setup.exe', 1000) ?? '', /can't be uploaded/);
  assert.match(evidenceFileProblem('noextension', 1000) ?? '', /can't be uploaded/);
  assert.match(evidenceFileProblem('huge.mov', MAX_EVIDENCE_FILE_BYTES + 1) ?? '', /larger than 2 GB/);
  assert.match(evidenceFileProblem('empty.jpg', 0) ?? '', /empty/);
});

test('file sizes are readable', () => {
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(250 * 1024 ** 2), '250 MB');
});
