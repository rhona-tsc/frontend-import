import test from 'node:test';
import assert from 'node:assert/strict';
import { getMusicianSocialPosts } from '../src/utils/musicianSocialPosts.js';
test('displays imported Instagram photos without a public post URL',()=>{
 const result=getMusicianSocialPosts({socialHighlightPostLinks:[{_id:'photo',platform:'instagram',mediaType:'image',mediaUrl:'https://res.cloudinary.com/test/image/upload/photo.jpg'}]});
 assert.equal(result.length,1);assert.equal(result[0].platform,'Instagram');assert.equal(result[0].imageUrl,'https://res.cloudinary.com/test/image/upload/photo.jpg');assert.equal(result[0].embedUrl,undefined);
});
test('uses only the cover image for legacy reels',()=>{
 const [result]=getMusicianSocialPosts({socialHighlightPostLinks:[{platform:'instagram',mediaType:'video',mediaUrl:'https://example.com/reel.mp4',thumbnailUrl:'https://example.com/cover.jpg'}]});assert.equal(result.imageUrl,'https://example.com/cover.jpg');
});
test('keeps Instagram photos visible even after six existing TikTok highlights',()=>{
 const tiktok=Array.from({length:6},(_,i)=>({_id:String(i),platform:'tiktok',mediaUrl:`https://www.tiktok.com/player/v1/${i+1}`,thumbnailUrl:`https://example.com/${i}.jpg`}));
 const posts=getMusicianSocialPosts({socialHighlightPostLinks:[...tiktok,{_id:'instagram',platform:'instagram',mediaType:'image',mediaUrl:'https://example.com/photo.jpg'}]});assert.equal(posts.length,7);assert.equal(posts[6].platform,'Instagram');
});
test('ignores hidden entries and invalid image URLs',()=>{
 assert.deepEqual(getMusicianSocialPosts({socialHighlightPostLinks:[{platform:'instagram',visible:false,mediaUrl:'https://example.com/photo.jpg'},{platform:'instagram',mediaUrl:'javascript:alert(1)'}]}),[]);
});
