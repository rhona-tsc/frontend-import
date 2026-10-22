import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { jenAndTomWedding as post } from '../data/jenAndTomWedding.js';
import { blogPosts } from '../data/BlogPosts.js';
import { buildPageSchema } from './structuredData.js';
test('the recovered article preserves known dates, credits and all twelve supplied photos',()=>{
 assert.ok(blogPosts.includes(post));assert.equal(post.publishedAt,'2017-04-23');assert.equal(post.author,'Rhona Downie');
 const photos=[post.heroImage,...post.content.filter(b=>b.type==='image').map(b=>b.src)];
 assert.equal(photos.length,12);assert.equal(new Set(photos).size,12);
 for(const photo of photos)assert.ok(existsSync(new URL('../../public'+photo,import.meta.url)));
 for(const block of post.content.filter(b=>b.type==='image'))assert.ok(block.alt&&block.width&&block.height);
 const schema=buildPageSchema({route:'/blog/'+post.slug,title:post.title,post});
 assert.equal(schema['@graph'].find(n=>n['@type']==='BlogPosting').author['@type'],'Person');
 assert.doesNotMatch(JSON.stringify(post),/garage band|Gotta Be Garage|password|subscription has expired/i);
});
test('legacy article redirects directly and missing public paths are not SPA rewrites',()=>{
 const redirects=readFileSync(new URL('../../public/_redirects',import.meta.url),'utf8');
 assert.match(redirects,/\/journal\/jen-and-toms-wedding\s+\/blog\/jen-and-toms-wedding\/\s+301!/);
 assert.doesNotMatch(redirects,/^\/(?:act|acts|blog)\/\*\s+\/index.html/m);
 assert.match(redirects,/^\/musician\/\*\s+\/index.html/m);
 assert.match(redirects,/^\/event-sheet\/\*\s+\/index.html/m);
 assert.match(redirects,/^\/venues\/claim\/\*\s+\/index.html/m);
});
