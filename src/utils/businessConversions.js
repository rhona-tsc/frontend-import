const ADS = {
  enquiry: "AW-17648722186/oq9lCMmY0rUdEIrCyN9B",
  booking: "AW-17648722186/sYMfCMyY0rUdEIrCyN9B",
};

// Receipts come only from a successful enquiry save or Stripe verification.
// Google also deduplicates by transaction_id if browser storage is unavailable.
export function trackBusinessConversion(receipt, win = typeof window === "undefined" ? null : window) {
  if (!win || typeof win.gtag !== "function" || !ADS[receipt?.kind] || !receipt?.id ||
      !String(receipt.id).startsWith(`${receipt.kind}:`)) return false;
  if (receipt.kind === "booking" && (!Number.isFinite(receipt.value) || receipt.value <= 0 || !/^[A-Z]{3}$/.test(receipt.currency))) return false;
  if (win.location?.hostname && !["thesupremecollective.co.uk", "www.thesupremecollective.co.uk"].includes(win.location.hostname)) return false;
  const key = `tsc:conversion:${receipt.id}`;
  try { if (win.localStorage.getItem(key) === "1") return false; } catch {}
  const params = { send_to: ADS[receipt.kind], transaction_id: receipt.id };
  if (receipt.kind === "booking") Object.assign(params, { value: receipt.value, currency: receipt.currency });
  // Explicit destinations keep the receipt out of unrelated Google products.
  try { win.gtag("event", "conversion", params); } catch { return false; }
  try { win.localStorage.setItem(key, "1"); } catch {}
  return true;
}

export const trackEnquiryResponse = (data) => {
  if (data?.success === true) return trackBusinessConversion(data.measurement);
  return false;
};
