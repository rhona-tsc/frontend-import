const array = (value) => (Array.isArray(value) ? value : []);
const urlOf = (value) =>
  typeof value === "string"
    ? value.trim()
    : String(value?.url || value?.secure_url || value?.videoUrl || value?.link || "").trim();

export const resolveEventSheetActMedia = ({ booking, acts = [] } = {}) => {
  const first = booking?.actsSummary?.[0] || booking?.items?.[0] || {};
  const embedded = first?.act || first?.actData || first?.profile || {};
  const actId = String(first?.actId || embedded?._id || booking?.act || "");
  const context = array(acts).find((act) => String(act?._id || "") === actId) || {};

  const images = [
    ...array(first?.images),
    ...array(first?.coverImage),
    ...array(first?.profileImage),
    first?.image,
    ...array(embedded?.images),
    ...array(embedded?.gallery),
    ...array(embedded?.galleryImages),
    embedded?.galleryOne,
    embedded?.galleryTwo,
    ...array(context?.images),
    ...array(context?.gallery),
    ...array(context?.galleryImages),
    context?.galleryOne,
    context?.galleryTwo,
  ].map(urlOf).filter(Boolean);

  const videos = [
    first?.promoVideo,
    first?.promoVideoUrl,
    first?.video,
    ...array(first?.tscVideos),
    ...array(first?.videos),
    ...array(first?.promoVideos),
    embedded?.promoVideo,
    embedded?.promoVideoUrl,
    embedded?.video,
    ...array(embedded?.tscVideos),
    ...array(embedded?.videos),
    context?.promoVideo,
    context?.promoVideoUrl,
    context?.video,
    ...array(context?.tscVideos),
    ...array(context?.videos),
  ].map(urlOf).filter(Boolean);

  return {
    images: [...new Set(images)].slice(0, 3),
    videos: [...new Set(videos)],
  };
};

const mergeAct = (previous = {}, updated = {}) => ({
  ...previous,
  ...updated,
  ...(previous?.actName ? { actName: previous.actName } : {}),
  ...(previous?.tscName ? { tscName: previous.tscName } : {}),
  ...(previous?.name ? { name: previous.name } : {}),
  ...(previous?.act ? { act: previous.act } : {}),
  ...(array(previous?.tscVideos).length ? { tscVideos: previous.tscVideos } : {}),
  ...(array(previous?.videos).length ? { videos: previous.videos } : {}),
  ...(array(previous?.images).length ? { images: previous.images } : {}),
});

export const mergeEventSheetBookingRefresh = (previous, updated) => {
  if (!previous) return updated || null;
  if (!updated) return previous;
  const previousActs = array(previous?.actsSummary);
  const updatedActs = array(updated?.actsSummary);
  const actsSummary = (updatedActs.length ? updatedActs : previousActs).map(
    (act, index) => mergeAct(previousActs[index], act),
  );
  const preserve = (next, current) =>
    array(next).length ? next : array(current);

  return {
    ...previous,
    ...updated,
    ...(previous?.actName ? { actName: previous.actName } : {}),
    ...(previous?.actTscName ? { actTscName: previous.actTscName } : {}),
    ...(previous?.tscName ? { tscName: previous.tscName } : {}),
    ...(actsSummary.length ? { actsSummary } : {}),
    eventSheet: {
      ...(previous?.eventSheet || {}),
      ...(updated?.eventSheet || {}),
    },
    assignedMusicians: preserve(updated?.assignedMusicians, previous?.assignedMusicians),
    bookingMusicians: preserve(updated?.bookingMusicians, previous?.bookingMusicians),
    bandLineup: preserve(updated?.bandLineup, previous?.bandLineup),
  };
};

