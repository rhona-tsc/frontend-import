import React,{useState} from 'react';
import {rememberEventSheetReturn} from '../../utils/eventSheetUploadSession.js';

export default function EventSheetUploadSignIn({access}) {
 const [staffOpen,setStaffOpen]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [clientLink,setClientLink]=useState(''),[linkError,setLinkError]=useState('');
 if(access.allowed)return access.canShareClientLink?<div className="my-3 text-sm"><button type="button" className="underline" onClick={async()=>{try{setClientLink(await access.createClientLink());setLinkError('');}catch{setLinkError('The secure link could not be created. Please try again.');}}}>Create secure client upload link</button>{clientLink&&<label className="mt-2 block">Client link — no account needed<input readOnly value={clientLink} onFocus={e=>e.target.select()} className="mt-1 block w-full rounded border p-2"/></label>}{linkError&&<p role="alert">{linkError}</p>}</div>:null;
 if(access.status==='checking')return <p role="status" className="mt-2 text-sm">Checking upload access…</p>;
 const signIn=async()=>{try{await access.signInStaff(email,password);}finally{setPassword('');}};
 return <div className="my-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm">
  <p>Clients can upload without an account using the secure link sent for their booking. You can also sign in below.</p>
  <div className="mt-2 flex gap-4">
   <a href="/login" className="underline" onClick={()=>rememberEventSheetReturn(sessionStorage,window.location.pathname,window.location.search)}>Client sign-in</a>
   <button type="button" className="underline" onClick={()=>setStaffOpen(!staffOpen)}>TSC staff sign-in</button>
  </div>
  {staffOpen&&<div className="mt-3 flex max-w-md flex-col gap-2">
   <label>Staff email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full rounded border bg-white p-2"/></label>
   <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 block w-full rounded border bg-white p-2"/></label>
   <button type="button" disabled={access.staffBusy||!email||!password} onClick={signIn} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">{access.staffBusy?'Signing in…':'Sign in to upload'}</button>
  </div>}
  {access.message&&<p role="alert" className="mt-2 text-red-700">{access.message}</p>}
 </div>;
}
