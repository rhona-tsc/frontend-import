import {useCallback,useEffect,useState} from 'react';
import axios from 'axios';
import {EVENT_SHEET_STAFF_SESSION,eventSheetUploadPath,uploadSessionToken} from '../../utils/eventSheetUploadSession.js';

export default function useEventSheetUploadAccess({backendUrl,bookingId,readOnly}) {
  const [status,setStatus]=useState('checking');
  const [message,setMessage]=useState('');
  const [staffBusy,setStaffBusy]=useState(false);
  const token=()=>uploadSessionToken(sessionStorage,localStorage);
  const check=useCallback(async candidate=>{
    if(!candidate) {setStatus('sign-in');return false;}
    try {
      await axios.get(eventSheetUploadPath(backendUrl,bookingId,'access'),{headers:{Authorization:`Bearer ${candidate}`}});
      setStatus('allowed');setMessage('');return true;
    } catch(error) {
      setStatus('sign-in');setMessage(error.response?.data?.message||'We could not check upload access. Please try again.');return false;
    }
  },[backendUrl,bookingId]);
  useEffect(()=>{
    if(readOnly||!bookingId)return;
    setStatus('checking');void check(token());
  },[bookingId,readOnly,check]);

  const signInStaff=async(email,password)=>{
    if(staffBusy)return false;
    setStaffBusy(true);setMessage('');
    try {
      // Use the existing staff login; credentials are never saved or logged.
      const {data}=await axios.post(`${backendUrl}/api/musician-login/login`,{email:email.trim().toLowerCase(),password},{timeout:15000});
      if(!data.success||!data.token||data.role!=='agent')throw Error('Please use your TSC staff sign-in. Clients should use Client sign-in.');
      if(data.mustChangePassword)throw Error('Please complete your password change in the staff dashboard first.');
      if(!await check(data.token))return false;
      sessionStorage.setItem(EVENT_SHEET_STAFF_SESSION,data.token);
      return true;
    } catch(error) {
      setMessage(error.response?.data?.message||error.message||'Sign-in failed. Please try again.');return false;
    } finally {setStaffBusy(false);}
  };
  const uploadFile=async file=>{
    const candidate=token();
    if(!candidate||status!=='allowed')throw {response:{status:401,data:{message:'Please sign in before uploading a file.'}}};
    const data=new FormData();data.append('file',file);
    try {return await axios.post(eventSheetUploadPath(backendUrl,bookingId),data,{headers:{Authorization:`Bearer ${candidate}`}});}
    catch(error) {if([401,403].includes(error.response?.status)){setStatus('sign-in');setMessage(error.response?.data?.message||'Please sign in again.');}throw error;}
  };
  return {allowed:status==='allowed',status,message,staffBusy,signInStaff,uploadFile};
}
