const hasKeys = (value) =>
  value && typeof value === "object" && Object.keys(value).length > 0;

export const hasSavedEventSheet = (eventSheet) =>
  Boolean(
    eventSheet &&
      (hasKeys(eventSheet.answers) ||
        hasKeys(eventSheet.complete) ||
        eventSheet.submitted === true ||
        eventSheet.updatedAt),
  );

export const resolveEventSheetHydration = ({
  serverEventSheet,
  cachedEventSheet,
}) => {
  const useServer = hasSavedEventSheet(serverEventSheet);
  const selected = useServer ? serverEventSheet : cachedEventSheet;

  return {
    answers: selected?.answers || {},
    complete: selected?.complete || {},
    source: useServer ? "server" : selected ? "cache" : "empty",
  };
};
