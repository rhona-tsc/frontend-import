import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import ActRepertoire from "../ActRepertoire";
import { resolveEventSheetActNames } from "../../utils/eventSheetActNames";
import {
  getEventSheetMusicianId,
  getEventSheetMusicianName,
  getEventSheetMusicianPublicName,
  resolveEventSheetDeputyVocalist,
} from "../../utils/eventSheetRepertoireSource";

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

  const { bookedName: actName, publicName: publicActName } =
    resolveEventSheetActNames({ booking, firstAct });
  const deputyVocalist = useMemo(
    () => resolveEventSheetDeputyVocalist(booking),
    [booking],
  );
  const deputyProfileKey = getEventSheetMusicianId(deputyVocalist);

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
          .includes(normaliseActName(publicActName)),
      ) ||
      null,
    [acts, firstAct, publicActName],
  );

  const inlineSongs = useMemo(() => {
    const candidates = deputyVocalist
      ? [deputyVocalist?.selectedSongs, deputyVocalist?.repertoire]
      : [
          firstAct?.selectedSongs,
          firstAct?.act?.selectedSongs,
          contextualAct?.selectedSongs,
        ];
    return candidates.find((songs) => Array.isArray(songs) && songs.length) || [];
  }, [contextualAct, deputyVocalist, firstAct]);

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
    slugifyActValue(publicActName);

  const profileKey = deputyVocalist ? deputyProfileKey : actSlug;
  const profile = loadedProfile.slug === profileKey ? loadedProfile.data : null;
  const loading = loadState.slug === profileKey && loadState.loading;
  const loadError = loadState.slug === profileKey ? loadState.error : "";

  useEffect(() => {
    if (!isOpen || inlineSongs.length || profile || !backendUrl || !profileKey) return;

    let cancelled = false;
    setLoadState({ slug: profileKey, loading: true, error: "" });

    const profileEndpoint = deputyVocalist
      ? `${backendUrl}/api/musician/profile/${encodeURIComponent(profileKey)}`
      : `${backendUrl}/api/act/${encodeURIComponent(profileKey)}`;

    axios
      .get(profileEndpoint)
      .then((response) => {
        if (cancelled) return;
        const nextProfile =
          response?.data?.musician || response?.data?.act || response?.data;
        if (!nextProfile || response?.data?.success === false) {
          throw new Error(
            deputyVocalist ? "Vocalist profile not found" : "Act profile not found",
          );
        }
        setLoadedProfile({ slug: profileKey, data: nextProfile });
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Repertoire load failed:", error?.message);
          setLoadState({
            slug: profileKey,
            loading: false,
            error: `We couldn’t load the ${deputyVocalist ? "vocalist’s" : "band’s"} repertoire here just now.`,
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadState((current) =>
              current.slug === profileKey
              ? { ...current, loading: false }
              : current,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [backendUrl, deputyVocalist, inlineSongs.length, isOpen, profile, profileKey]);

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

  const vocalistName =
    getEventSheetMusicianPublicName(profile, deputyVocalist) ||
    getEventSheetMusicianName(deputyVocalist);
  const repertoireName = deputyVocalist ? vocalistName : actName;
  const vocalistSlug = profile?.musicianSlug || deputyProfileKey;
  const profileUrl = deputyVocalist
    ? vocalistSlug
      ? `/musician/${encodeURIComponent(vocalistSlug)}/`
      : ""
    : actSlug
      ? `/act/${encodeURIComponent(actSlug)}/`
      : "";
  const possessiveActName = /s$/i.test(repertoireName)
    ? `${repertoireName}’`
    : `${repertoireName}’s`;

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
          <p className="text-sm text-gray-600">
            Loading the {deputyVocalist ? "vocalist’s" : "band’s"} repertoire…
          </p>
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
                Open the {deputyVocalist ? "vocalist" : "act"} profile instead
              </a>
            )}
          </p>
        )}

        {!loading && !loadError && songs.length === 0 && isOpen && (
          <p className="text-sm text-gray-600">
            No repertoire has been published for this {deputyVocalist ? "vocalist" : "act"} yet.
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
              key={profileKey}
              selectedSongs={songs}
              actData={{
                ...(profile || contextualAct || {}),
                tscName: repertoireName,
              }}
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
