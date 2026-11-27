import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTION_ATTACHMENTS, MAX_ATTACHMENT_BYTES, safeAttachmentUrl, validateEventSheetAttachment } from './eventSheetAttachments.js';
test('location, parking and room documents persist in independent answer fields', () => {
  const keys = Object.values(SECTION_ATTACHMENTS).map(s => s.key);
  assert.equal(new Set(keys).size, 3);
  const saved = { [keys[0]]: [{ name: 'Access.pdf' }], [keys[1]]: [{ name: 'Permit.pdf' }] };
  const roundTrip = JSON.parse(JSON.stringify(saved));
  roundTrip[keys[0]] = [];
  assert.equal(roundTrip[keys[1]][0].name, 'Permit.pdf');
});
test('rejects unsupported, empty and oversized files while allowing documents and images', () => {
  for (const name of ['map.pdf','room.docx','permit.doc','stage.jpg','map.png','stage.webp']) assert.equal(validateEventSheetAttachment({name,size:100}), '');
  assert.ok(validateEventSheetAttachment({name:'run.html',size:100}));
  assert.ok(validateEventSheetAttachment({name:'map.pdf',size:0}));
  assert.ok(validateEventSheetAttachment({name:'map.pdf',size:MAX_ATTACHMENT_BYTES+1}));
});
test('document links cannot execute script or expose inline data', () => {
  for (const url of ['javascript:alert(1)','data:text/html,test','https://user:secret@example.com/file']) assert.equal(safeAttachmentUrl(url), '');
  assert.equal(safeAttachmentUrl('https://example.com/map.pdf'), 'https://example.com/map.pdf');
});
