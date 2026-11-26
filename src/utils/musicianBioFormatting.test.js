import test from 'node:test';import assert from 'node:assert/strict';import {renderBioBold} from './musicianBioFormatting.js';
test('plain text and existing HTML bios both render Markdown bold',()=>{
 assert.equal(renderBioBold('Her **velvety vocals**'),'Her <strong>velvety vocals</strong>');
 assert.equal(renderBioBold('<p>Her **velvety vocals** and <em>tone</em>.</p>'),'<p>Her <strong>velvety vocals</strong> and <em>tone</em>.</p>');
 assert.equal(renderBioBold('<a title="**leave attribute**">**Bold**</a>'),'<a title="**leave attribute**"><strong>Bold</strong></a>');
});
