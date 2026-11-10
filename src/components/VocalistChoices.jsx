import { useEffect, useState } from "react";
import { choiceKey, matchVocalistChoices, restoreVocalistPicks, pickVocalist, preferUsualVocalists, initialVocalistPicks } from "../utils/vocalistChoices.js";
import { cloudinaryImage } from "../utils/cloudinaryImage.js";

export async function fetchVocalistChoices({ actId, lineupId, date, address }, signal) {
  const params = new URLSearchParams({ actId, lineupId, dateISO: String(date).slice(0, 10), address });
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/availability/vocalist-choices?${params}`, { signal, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message);
  return data;
}

export default function VocalistChoices({ actId, lineupId, date, address, selected = [], onChange, onStatus, refreshKey, loadChoices = fetchVocalistChoices }) {
  const [result, setResult] = useState(null);
  const [picks, setPicks] = useState({});
  const [error, setError] = useState("");
  const key = choiceKey(actId, lineupId, date, address);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError(""); onStatus(key, false);
    loadChoices({ actId, lineupId, date, address }, controller.signal)
      .then(data => { const roles = preferUsualVocalists(data.roles); setResult({ ...data, roles }); setPicks(initialVocalistPicks(roles, selected)); })
      .catch(err => { if (err.name !== "AbortError") setError("We’re still checking availability. Please try again shortly or contact our bookings team."); });
    return () => controller.abort();
  }, [key, refreshKey, onStatus, loadChoices]);
  const roles = result?.roles || [];
  const assignment = result ? matchVocalistChoices(roles, selected) : null;
  useEffect(() => { onStatus(key, Boolean(assignment)); }, [key, Boolean(assignment), onStatus]);
  // Include usual singers automatically; leave genuine deputy alternatives
  // for the client to choose. Every selection still has a distinct role.
  useEffect(() => {
    if (!result) return;
    const defaults = initialVocalistPicks(roles, selected);
    const ids = Object.values(defaults);
    setPicks(defaults);
    if (ids.join("|") !== selected.join("|")) onChange(ids);
  }, [result]);
  if (error) return <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">{error}</p>;
  if (!result) return <p className="mt-4 text-sm text-gray-500">Checking your lineup’s availability…</p>;
  if (!roles.length) return null;
  const hasRegular = roles.some(role => role.candidates.some(person => !person.isDeputy));
  const choiceNeeded = roles.some(role => role.candidates.length > 1);
  const pick = (role, id) => {
    const next = pickVocalist(picks, role.slotIndex, id);
    setPicks(next); onChange(Object.values(next));
  };
  if (hasRegular && result.complete && !choiceNeeded) return <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
    <h3 className="text-lg font-semibold text-gray-800">The band is available</h3>
    <p className="mt-2 text-sm leading-6 text-gray-600">Your band’s vocal lineup is available for your date. Continue below to secure your booking.</p>
    <details className="mt-3 text-sm text-gray-600"><summary className="cursor-pointer">View your lineup</summary>
      <ul className="mt-2 space-y-2">{roles.map(role => <li key={role.slotIndex}><a className="underline" href={role.candidates[0].profileUrl} target="_blank" rel="noopener noreferrer">{role.candidates[0].displayName}</a></li>)}</ul>
    </details>
  </section>;
  return <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
    <h3 className="text-lg font-semibold text-gray-800">{result.complete ? "The band is available" : "We’re checking your lineup"}</h3>
    {!hasRegular && result.complete && result.allRegularUnavailable && <p className="mt-2 text-sm leading-6 text-gray-600">The band’s usual vocalists are unavailable for your date. Their trusted deputies below have confirmed availability. Choose one vocalist for each role.</p>}
    {hasRegular && choiceNeeded && <p className="mt-2 text-sm text-gray-600">Complete your lineup below. Your choices will appear on your booking confirmation.</p>}
    <div className="mt-4 space-y-5">{roles.map((role, index) => <fieldset key={role.slotIndex}>
      <legend className="mb-3 text-sm font-medium text-gray-700">{roles.length > 1 ? `Vocalist ${index + 1} · ${role.label}` : "Your vocalist"}</legend>
      {!role.candidates.length && <p className="text-sm text-gray-500">Availability is still being confirmed for this role.</p>}
      <div className={`grid grid-cols-2 gap-3 ${role.candidates.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>{role.candidates.map(person => {
        const chosen = picks[role.slotIndex] === person.musicianId;
        return <div key={person.musicianId} className={`rounded-xl border p-3 ${chosen ? "border-[#ff6667] bg-rose-50" : "border-gray-200"}`}>
          {person.photoUrl ? <img src={cloudinaryImage(person.photoUrl, 240)} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" /> : <div aria-hidden="true" className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500">{person.displayName.split(/\s+/).map(part => part[0]).slice(0, 2).join("")}</div>}
          <p className="mt-2 text-center text-sm font-medium text-gray-800">{person.displayName}</p>
          <div className="mt-2 text-center"><a href={person.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 underline">View profile</a></div>
          <button type="button" aria-pressed={chosen} className={`mt-3 w-full rounded-lg px-3 py-2 text-sm ${chosen ? "bg-[#ff6667] text-white" : "bg-gray-100 text-gray-800"}`} onClick={() => pick(role, person.musicianId)}>{chosen ? "Selected" : "Choose"}</button>
        </div>;
      })}</div>
    </fieldset>)}</div>
    <p className="mt-4 text-sm text-gray-500">{assignment ? "Your vocal lineup is complete." : `Please choose ${roles.length} different ${roles.length === 1 ? "vocalist" : "vocalists"}, one for each role, to continue.`}</p>
  </section>;
}
