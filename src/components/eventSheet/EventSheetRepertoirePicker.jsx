import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import ActRepertoire from "../ActRepertoire";

const slugifyActValue = (value = "") =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const normaliseSongLine = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s*[–—-]\s*/g, " - ")
    .replace(/\s+/g, " ");

const songLine = (song = {}) =>
  [String(song?.title || "").trim(), String(song?.artist || "").trim()]
    .filter(Boolean)
    .join(" – ");

const songKey = (song = {}) => normaliseSongLine(songLine(song));

const normaliseActName = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const EventSheetRepertoirePicker = ({
  backendUrl,
  booking,
  acts = [],
  value = "",
  onChange,
  readOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState({ slug: "", data: null });
  const [loadState, setLoadState] = useState({
    slug: "",
    loading: false,
    error: "",
  });

  const firstAct = useMemo(
    () =>
      (Array.isArray(booking?.actsSummary) && booking.actsSummary[0]) ||
      (Array.isArray(booking?.items) && booking.items[0]) ||
      {},
    [booking],
  );

  const actName =
    firstAct?.tscName ||
    firstAct?.actName ||
    firstAct?.name ||
    booking?.actTscName ||
    booking?.actName ||
    "the band";

  const contextualAct = useMemo(
    () =>
      (acts || []).find(
        (candidate) =>
          String(candidate?._id || candidate?.actId || "") ===
          String(firstAct?.actId || firstAct?._id || ""),
      ) ||
      (acts || []).find((candidate) =>
        [candidate?.tscName, candidate?.name]
          .map(normaliseActName)
          .filter(Boolean)
          .includes(normaliseActName(actName)),
      ) ||
      null,
    [acts, firstAct, actName],
  );

  const inlineSongs = useMemo(() => {
    const candidates = [
      firstAct?.selectedSongs,
      firstAct?.act?.selectedSongs,
      contextualAct?.selectedSongs,
    ];
    return candidates.find((songs) => Array.isArray(songs) && songs.length) || [];
  }, [contextualAct, firstAct]);

  const actSlug =
    firstAct?.actSlug ||
    firstAct?.seoSlug ||
    firstAct?.slug ||
    firstAct?.act?.actSlug ||
    firstAct?.act?.seoSlug ||
    firstAct?.act?.slug ||
    contextualAct?.actSlug ||
    contextualAct?.seoSlug ||
    contextualAct?.slug ||
    slugifyActValue(actName);

  const profile = loadedProfile.slug === actSlug ? loadedProfile.data : null;
  const loading = loadState.slug === actSlug && loadState.loading;
  const loadError = loadState.slug === actSlug ? loadState.error : "";

  useEffect(() => {
    if (!isOpen || inlineSongs.length || profile || !backendUrl || !actSlug) return;

    let cancelled = false;
    setLoadState({ slug: actSlug, loading: true, error: "" });

    axios
      .get(`${backendUrl}/api/act/${encodeURIComponent(actSlug)}`)
      .then((response) => {
        if (cancelled) return;
        const nextProfile = response?.data?.act || response?.data;
        if (!nextProfile || response?.data?.success === false) {
          throw new Error("Act profile not found");
        }
        setLoadedProfile({ slug: actSlug, data: nextProfile });
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Repertoire load failed:", error?.message);
          setLoadState({
            slug: actSlug,
            loading: false,
            error: "We couldn’t load the repertoire here just now.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadState((current) =>
            current.slug === actSlug
              ? { ...current, loading: false }
              : current,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [actSlug, backendUrl, inlineSongs.length, isOpen, profile]);

  const songs = useMemo(
    () =>
      inlineSongs.length
        ? inlineSongs
        : Array.isArray(profile?.selectedSongs)
          ? profile.selectedSongs
          : [],
    [inlineSongs, profile],
  );

  const selectedLineKeys = useMemo(
    () =>
      new Set(
        String(value || "")
          .split(/\r?\n/)
          .map(normaliseSongLine)
          .filter(Boolean),
      ),
    [value],
  );

  const favourites = useMemo(
    () => songs.filter((song) => selectedLineKeys.has(songKey(song))),
    [selectedLineKeys, songs],
  );

  const toggleSong = (song) => {
    if (readOnly || typeof onChange !== "function") return;

    const canonicalLine = songLine(song);
    if (!canonicalLine) return;

    const canonicalKey = normaliseSongLine(canonicalLine);
    const currentLines = String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const existingIndex = currentLines.findIndex(
      (line) => normaliseSongLine(line) === canonicalKey,
    );

    if (existingIndex >= 0) currentLines.splice(existingIndex, 1);
    else currentLines.push(canonicalLine);

    onChange(currentLines.join("\n"));
  };

  const profileUrl = actSlug ? `/act/${encodeURIComponent(actSlug)}` : "";
  const possessiveActName = /s$/i.test(actName) ? `${actName}’` : `${actName}’s`;

  return (
    <details
      className="mb-3 rounded border bg-gray-50"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6667]">
        Browse {possessiveActName} repertoire
        {songs.length ? ` (${songs.length} songs)` : ""}
      </summary>

      <div className="border-t bg-white p-3">
        {loading && (
          <p className="text-sm text-gray-600">Loading the band’s repertoire…</p>
        )}

        {!loading && loadError && (
          <p className="text-sm text-gray-600">
            {loadError}{" "}
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#ff6667] underline hover:opacity-80"
              >
                Open the act profile instead
              </a>
            )}
          </p>
        )}

        {!loading && !loadError && songs.length === 0 && isOpen && (
          <p className="text-sm text-gray-600">
            No repertoire has been published for this act yet.
          </p>
        )}

        {!loading && songs.length > 0 && (
          <>
            {!readOnly && (
              <p className="mb-3 text-sm text-gray-600">
                Search or filter the list, then select the heart beside a song to
                add it to your suggestions below. Select it again to remove it.
              </p>
            )}
            <ActRepertoire
              key={actSlug}
              selectedSongs={songs}
              actData={profile || contextualAct || { tscName: actName }}
              favourites={favourites}
              toggleFavourite={toggleSong}
              showHeader={false}
              showIntro={false}
              interactive={!readOnly}
            />
          </>
        )}
      </div>
    </details>
  );
};

EventSheetRepertoirePicker.propTypes = {
  backendUrl: PropTypes.string,
  booking: PropTypes.object,
  acts: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
};

export default EventSheetRepertoirePicker;
