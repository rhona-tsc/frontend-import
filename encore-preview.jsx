import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import axios from 'axios';
import {ShopContext} from './src/context/ShopContext';
import ViewEventSheet from './src/pages/ViewEventSheet';
import './src/index.css';
const roles=['Lead Female Vocal / Rapper','Electric Guitar','Drums','Bass Guitar'];
const extra={name:'Saxophone',price:640,quantity:1,addsMusician:true,musicianRole:'Saxophone'};
const booking={_id:'699999999999999999999999',bookingId:'EXAMPLE',bookingBoardId:'699999999999999999999998',agent:'Encore',eventType:'Birthday Party',eventDate:'2026-12-31',date:'2026-12-31',currency:'GBP',clientName:'Example Client',lineupSelected:'Bespoke 4-piece',lineupLabel:'Bespoke 4-piece + Saxophone (5 musicians)',lineupComposition:roles,bandSize:4,extras:[extra],
 totals:{bookingTotal:2615,fullAmount:3255,addOnsPostBooking:640,remainingAmount:640},paymentArrangement:{provider:'Encore',arrangedAmount:2615,extrasPaid:false},actsSummary:[{actName:'Soul Allegiance',tscName:'Soul Allegiance',lineupLabel:'Bespoke 4-piece + Saxophone (5 musicians)',lineup:{actSize:'Bespoke 4-piece',bandMembers:roles.map(instrument=>({instrument}))},selectedExtras:[extra],performance:{arrivalTime:'21:00',startTime:'21:00',finishTime:'00:30'}}], eventSheet:{answers:{},complete:{},emergencyContact:{number:'Example',ivrCode:'1234'}}};
window.__previewRequests=[];
axios.defaults.adapter=async config=>{window.__previewRequests.push({method:config.method,url:config.url});return{data:config.url.includes('by-ref')?booking:{success:true},status:200,statusText:'OK',headers:{'content-type':'application/json'},config};};
window.fetch=async()=>new Response(JSON.stringify({success:true}),{headers:{'content-type':'application/json'}});
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/event-sheet/EXAMPLE']}><ShopContext.Provider value={{user:null,acts:[]}}><Routes><Route path="/event-sheet/:bookingId" element={<ViewEventSheet/>}/></Routes></ShopContext.Provider></MemoryRouter>);
