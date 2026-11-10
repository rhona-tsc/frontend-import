import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import VocalistChoices from '../src/components/VocalistChoices.jsx';
const person = (musicianId, displayName, isDeputy = true) => ({ musicianId, displayName, isDeputy, profileUrl: '#profile' });
const roles = [
  { slotIndex: 0, label: 'Lead Female Vocal', candidates: [person('alex', 'Alex Morgan'), person('beth', 'Beth Collins')] },
  { slotIndex: 1, label: 'Lead Male Vocal', candidates: [person('chris', 'Chris Taylor'), person('dan', 'Dan Williams')] },
];
const choices = async () => ({ success: true, complete: true, allRegularUnavailable: true, roles });
const usual = async () => ({ success: true, complete: true, allRegularUnavailable: false, roles: [{ ...roles[0], candidates: [person('alex','Alex Morgan',false)] }, { ...roles[1], candidates: [person('chris','Chris Taylor',false)] }] });
function Review() {
  const [selected, setSelected] = useState([]); const [ready, setReady] = useState(false); const [mode, setMode] = useState('deputy');
  const onStatus = useCallback((key, value) => setReady(value), []);
  return <main className="mx-auto max-w-3xl px-5 py-10 text-gray-800"><p className="text-xs uppercase tracking-widest text-gray-400">The Supreme Collective · Local review</p><h1 className="mt-3 font-['Prata'] text-3xl">Your band. Your celebration.</h1><p className="mt-3 text-sm text-gray-600">Example eight-piece band · Two vocalists · 5 June 2027 · Example venue</p><div className="mt-5 flex gap-3"><button className="rounded-full border px-4 py-2 text-sm" onClick={() => { setMode('usual'); setSelected([]); }}>Usual lineup</button><button className="rounded-full border px-4 py-2 text-sm" onClick={() => { setMode('deputy'); setSelected([]); }}>Deputy choices</button></div><VocalistChoices key={mode} actId="example-act" lineupId="example-lineup" date="2027-06-05" address="Example venue" selected={selected} onChange={setSelected} onStatus={onStatus} loadChoices={mode === 'usual' ? usual : choices}/><button disabled={!ready} className="mt-6 w-full rounded-xl bg-[#ff6667] px-6 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">Continue to booking</button><p className="mt-3 text-center text-xs text-gray-400">Example only · This preview does not submit enquiries or take payments.</p></main>;
}
createRoot(document.getElementById('root')).render(<Review/>);
