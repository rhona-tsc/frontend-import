const clean = (value) => String(value || "").trim();

const sourceText = (booking = {}) => {
  const items = Array.isArray(booking?.actsSummary)
    ? booking.actsSummary
    : Array.isArray(booking?.items)
      ? booking.items
      : [];
  const extras = items.flatMap((item) =>
    Array.isArray(item?.selectedExtras) ? item.selectedExtras : [],
  );

  return [
    booking?.bookingDetails?.playlistService,
    booking?.playlistService,
    booking?.performancePlan,
    booking?.bookingDetails?.performancePlan,
    ...extras.flatMap((extra) => [extra?.name, extra?.key, extra?.label]),
  ]
    .map(clean)
    .filter(Boolean)
    .join(" | ");
};

export const bookedScheduleServiceLabel = (booking = {}) => {
  const source = sourceText(booking);
  if (/band\s*member\s*dj|pro\s*dj/i.test(source)) {
    return "Band Member DJ Service";
  }
  if (/manned[_\s-]*playlist/i.test(source)) {
    return "Manned Playlist Service";
  }
  if (/playlist[_\s-]*dj|dj[_\s-]*playlist|complimentary\s*playlist/i.test(source)) {
    return "Playlist DJ Service";
  }
  return "";
};

export const performanceSetPlan = (booking = {}, fallback = { sets: 3, length: 40 }) => {
  const plan = clean(
    booking?.performancePlan ||
      booking?.actsSummary?.[0]?.performancePlan ||
      booking?.bookingDetails?.performancePlan,
  );
  const matches = [...plan.matchAll(/(\d+)\s*[x×]\s*(\d+)/gi)].map((match) => ({
    sets: Number(match[1]),
    length: Number(match[2]),
  }));
  const valid = matches.filter((option) => option.sets > 0 && option.length > 0);
  if (!valid.length) return fallback;

  // Where the contract offers alternatives (normally 2x60 or 3x40), start
  // with the more detailed running order. The client can still remove rows.
  return valid.sort((a, b) => b.sets - a.sets)[0];
};

const ordinalWord = (number) =>
  ["First", "Second", "Third", "Fourth", "Fifth"][number - 1] || `Set ${number}`;

export const buildDefaultScheduleRows = ({
  booking = {},
  arrival = "",
  arrivalMinutes = null,
  setupMinutes = 60,
  soundcheckMinutes = 30,
  changeMinutes = 15,
  range = () => "",
} = {}) => {
  const setupEnd = Number.isFinite(arrivalMinutes)
    ? arrivalMinutes + setupMinutes
    : null;
  const soundcheckEnd = Number.isFinite(setupEnd)
    ? setupEnd + soundcheckMinutes
    : null;
  const changeEnd = Number.isFinite(soundcheckEnd)
    ? soundcheckEnd + changeMinutes
    : null;
  const { sets, length } = performanceSetPlan(booking);
  const serviceLabel = bookedScheduleServiceLabel(booking);

  const rows = [
    { activity: "Band arrival", time: arrival, notes: "" },
    {
      activity: "Setup",
      time: range(arrivalMinutes, setupEnd),
      notes: `${setupMinutes} minutes`,
    },
    {
      activity: "Soundcheck",
      time: range(setupEnd, soundcheckEnd),
      notes: `${soundcheckMinutes} minutes`,
    },
    {
      activity: "Change time",
      time: range(soundcheckEnd, changeEnd),
      notes: `${changeMinutes} minutes`,
    },
  ];

  for (let index = 1; index <= sets; index += 1) {
    rows.push({
      activity: `${ordinalWord(index)} Set`,
      time: "",
      notes: `${length} minutes`,
    });
    if (index < sets) {
      rows.push({
        activity: serviceLabel || "Intermission",
        time: "",
        notes: "",
      });
    }
  }

  return rows;
};

