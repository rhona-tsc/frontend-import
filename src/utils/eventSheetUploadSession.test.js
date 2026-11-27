import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadSessionToken,uploadAuthorization,eventSheetUploadPath,rememberEventSheetReturn,EVENT_SHEET_STAFF_SESSION} from './eventSheetUploadSession.js';
const storage=values=>({getItem:key=>values[key]||null,setItem:(key,value)=>{values[key]=value;}});
test('upload access uses explicit staff sign-in or the current client session',()=>{
 assert.equal(uploadSessionToken(storage({[EVENT_SHEET_STAFF_SESSION]:'staff-test-session'}),storage({token:'client-test-session'})),'staff-test-session');
 assert.equal(uploadSessionToken(storage({}),storage({token:'client-test-session'})),'client-test-session');
 assert.equal(uploadSessionToken(storage({}),storage({})),'');
 assert.equal(eventSheetUploadPath('https://example.test','BBM 499/BREWERS','access'),'https://example.test/api/upload/event-sheet/BBM%20499%2FBREWERS/access');
});
test('secure links use a booking-specific upload capability and remove it from the address bar',()=>{
 const state={},session=storage(state);let replaced='';const value='A'.repeat(43);
 const header=uploadAuthorization(session,storage({}),'synthetic-booking',{hash:'#upload='+value,pathname:'/event-sheet/synthetic-booking',search:''},{state:null,replaceState:(_s,_t,path)=>{replaced=path;}});
 assert.equal(header,'EventSheetUpload '+value);assert.equal(replaced,'/event-sheet/synthetic-booking');
 assert.equal(uploadAuthorization(session,storage({}),'different-booking',{hash:'',pathname:'/event-sheet/different-booking',search:''},{state:null,replaceState(){}}),'');
});
test('client sign-in returns to the event sheet, never an external destination',()=>{
 const state={};rememberEventSheetReturn(storage(state),'/event-sheet/test','?view=client');
 assert.equal(state.postLoginNext,'/event-sheet/test?view=client');
 rememberEventSheetReturn(storage(state),'//evil.example/path');assert.equal(state.postLoginNext,'/');
});
