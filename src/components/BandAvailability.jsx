import { useEffect, useState } from "react";
import { fetchVocalistChoices } from "./VocalistChoices.jsx";
export default function BandAvailability({ actId, lineupId, date, address, refreshKey }) {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    setSummary(null);
    if (!actId || !lineupId || !date || !address) return;
    const controller = new AbortController();
    fetchVocalistChoices({ actId: String(actId), lineupId: String(lineupId), date, address }, controller.signal)
      .then(result => setSummary(result)).catch(() => {});
    return () => controller.abort();
  }, [actId, lineupId, date, address, refreshKey]);
  if (!summary?.complete || !summary.roles?.length) return null;
  const hasRegular = summary.roles.some(role => role.candidates.some(person => !person.isDeputy));
  return <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left">
    <p className="text-sm font-semibold text-emerald-900">The band is available</p>
    {!hasRegular && summary.allRegularUnavailable && <p className="mt-1 text-sm leading-6 text-gray-600">The usual vocalists are unavailable for your date. Trusted deputies have confirmed availability — view their profiles and choose your vocalists in your cart.</p>}
  </div>;
}
