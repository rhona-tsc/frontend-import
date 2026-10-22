/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BACKEND } from "../apiBase";
import SEO from "../components/SEO";

const fieldClass = "mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-black/10";
const Field = ({ label, value, onChange, multiline = false, type = "text", placeholder = "" }) => <label className="block text-sm font-semibold text-gray-800">{label}{multiline ? <textarea rows={4} className={fieldClass} value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /> : <input type={type} className={fieldClass} value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}</label>;

export default function VenueClaim() {
  const { token } = useParams();
  const [venue, setVenue] = useState(null);
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${BACKEND}/api/venues/claim/${encodeURIComponent(token)}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "This editing link is not valid");
      if (active) { setVenue(data.venue); setForm({ ...data.venue, partnershipInterest: Boolean(data.partnershipInterest), partnershipMessage: data.partnershipMessage || "" }); }
    }).catch((err) => active && setError(err.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const setRoom = (index, key, value) => setForm((old) => ({ ...old, rooms: (old.rooms || []).map((room, i) => i === index ? { ...room, [key]: value } : room) }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const body = new FormData();
      body.append("changes", JSON.stringify(form));
      if (photo) body.append("photo", photo);
      const response = await fetch(`${BACKEND}/api/venues/claim/${encodeURIComponent(token)}`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not submit these changes");
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <main className="mx-auto max-w-4xl py-20 text-center text-gray-500">Opening your secure venue form…</main>;
  if (error && !form) return <main className="mx-auto max-w-3xl py-20"><div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800"><h1 className="text-2xl font-semibold">This link cannot be opened</h1><p className="mt-3">{error}</p></div></main>;
  if (done) return <main className="mx-auto max-w-3xl py-20"><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8"><h1 className="text-3xl font-semibold">Thank you</h1><p className="mt-3 leading-7">Your venue updates have been sent to The Supreme Collective. We will check them before anything is published.</p></div></main>;

  return <main className="mx-auto max-w-5xl pb-20 pt-6">
    <SEO title={`Review ${venue?.name || "venue"} | The Supreme Collective`} description="Secure venue listing review form." path={`/venues/claim/${token}`} noindex />
    <section className="rounded-[2rem] bg-black px-6 py-10 text-white sm:px-10"><p className="text-sm font-semibold uppercase tracking-[.2em] text-[#ff6677]">Secure venue review</p><h1 className="mt-3 text-4xl font-semibold">Review {venue?.name}</h1><p className="mt-4 max-w-3xl leading-7 text-gray-300">Check the public information, add an official promotional photo and suggest corrections. Your submission is reviewed by our team before it appears online.</p></section>
    <form onSubmit={submit} className="mt-7 space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8"><h2 className="text-2xl font-semibold">Public venue details</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Venue name" value={form.name} onChange={(value) => set("name", value)} /><Field label="Postcode" value={form.postcode} onChange={(value) => set("postcode", value)} /><div className="md:col-span-2"><Field label="Address" value={form.address} onChange={(value) => set("address", value)} /></div><div className="md:col-span-2"><Field label="Short public description" value={form.publicDescription} onChange={(value) => set("publicDescription", value)} multiline placeholder="Tell couples what makes the venue special." /></div><Field label="Official website" value={form.website} onChange={(value) => set("website", value)} /><Field label="Direct enquiry page" value={form.enquiryUrl} onChange={(value) => set("enquiryUrl", value)} /><Field label="Public enquiries email" type="email" value={form.publicEmail} onChange={(value) => set("publicEmail", value)} /><Field label="Public phone number" value={form.publicPhone} onChange={(value) => set("publicPhone", value)} /><Field label="Google Maps link" value={form.googleMapsUrl} onChange={(value) => set("googleMapsUrl", value)} /><Field label="what3words link" value={form.what3wordsUrl} onChange={(value) => set("what3wordsUrl", value)} /></div></section>
      <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8"><h2 className="text-2xl font-semibold">Official promotional photo</h2>{venue?.photoUrl && <img src={venue.photoUrl} alt={venue.photoAlt || venue.name} className="mt-4 aspect-[8/5] max-h-96 w-full rounded-2xl object-cover" />}<label className="mt-5 block text-sm font-semibold">Upload a replacement image (JPG, PNG, WebP or AVIF, up to 8MB)<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={fieldClass} onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></label><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Image description" value={form.photoAlt} onChange={(value) => set("photoAlt", value)} /><Field label="Official source page" value={form.photoSourceUrl} onChange={(value) => set("photoSourceUrl", value)} /></div></section>
      <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Rooms and performance spaces</h2><p className="mt-1 text-sm text-gray-600">Only add details that are suitable for the public venue guide.</p></div><button type="button" onClick={() => set("rooms", [...(form.rooms || []), { name: "", performanceArea: "", changingRoom: "", capacity: "", soundLimitations: "", soundLimiterDb: "", curfewAndCloseTime: "", paAndLighting: "", powerAndStage: "" }])} className="rounded-full border border-black px-4 py-2 text-sm font-semibold">+ Add room</button></div><div className="mt-5 space-y-5">{(form.rooms || []).map((room, index) => <div key={room._id || index} className="rounded-2xl bg-gray-50 p-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Room / space name" value={room.name} onChange={(value) => setRoom(index, "name", value)} /><Field label="Capacity" value={room.capacity} onChange={(value) => setRoom(index, "capacity", value)} /><Field label="Performance area" value={room.performanceArea} onChange={(value) => setRoom(index, "performanceArea", value)} multiline /><Field label="Changing / green room" value={room.changingRoom} onChange={(value) => setRoom(index, "changingRoom", value)} multiline /><Field label="Sound restrictions" value={room.soundLimitations} onChange={(value) => setRoom(index, "soundLimitations", value)} multiline /><Field label="Limiter level" value={room.soundLimiterDb} onChange={(value) => setRoom(index, "soundLimiterDb", value)} /></div></div>)}</div></section>
      <section className="rounded-3xl border border-[#ffb8bf] bg-[#fff5f6] p-6 sm:p-8"><h2 className="text-2xl font-semibold">Work together</h2><label className="mt-4 flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={Boolean(form.partnershipInterest)} onChange={(event) => set("partnershipInterest", event.target.checked)} /><span><b>I would like to discuss a recommended-supplier partnership</b><span className="mt-1 block text-sm text-gray-700">We can explore reciprocal recommendations and adding the venue’s direct enquiry details to our guide.</span></span></label>{form.partnershipInterest && <div className="mt-4"><Field label="Anything you would like us to know" value={form.partnershipMessage} onChange={(value) => set("partnershipMessage", value)} multiline /></div>}</section>
      {error && <p className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}
      <div className="flex justify-end"><button disabled={saving} className="rounded-full bg-black px-7 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Sending…" : "Send changes for review"}</button></div>
    </form>
  </main>;
}
