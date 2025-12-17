import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { assets } from "../assets/assets";
import Title from "./Title";
import { getPossessiveTitleCase } from "../pages/utils/getPossessiveTitleCase"; // adjust path as needed

// --- Genre helpers (kept for filtering UX) ---
const genreMap = {
  "Funk & Disco": ["Funk", "Disco", "Jazz Funk", "Jazz Fusion", "Fusion"],
  "RnB, HipHop & Garage": [
    "Hip-Hop",
    "R&B",
    "Rap",
    "UK Garage",
    "Garage Rock",
    "Proto-Punk",
  ],
  "Alternative & Punk": [
    "Alternative",
    "Alternative Rock",
    "Alternative Metal",
    "Nu Metal",
    "Punk",
    "Punk Rock",
    "Post-Punk",
    "Proto-Punk",
  ],
  "Indie & Rock": [
    "Indie",
    "Indie Rock",
    "Indie Folk",
    "Indie Pop",
    "Pop Rock",
    "Soft Rock",
    "Rock",
    "Southern Rock",
    "Surf Rock",
    "Glam Rock",
    "Garage Rock",
    "Hard Rock",
    "Jazz Rock",
    "Latin Rock",
  ],
  "Dance & Electronic": [
    "Dance",
    "Dance Pop",
    "Dance-Pop",
    "Electronic",
    "Electropop",
    "EDM",
    "Eurodance",
    "House",
    "Drum and Bass",
    "Trip-Hop",
    "Synthpop",
    "Tropical House",
    "Electronic Dance Music",
  ],
  "Reggae & Afrobeat": [
    "Afrobeat",
    "Afrobeats",
    "Reggae",
    "Reggaeton",
    "Reggae Fusion",
    "Dancehall",
  ],
  "Soul & Motown": ["Soul", "Motown", "Bossa Nova"],
  "Pop & Classic Pop": [
    "Pop",
    "Pop Rock",
    "Pop Ballad",
    "Pop Punk",
    "Comedy",
    "Showtunes",
    "Musical",
    "Disney",
  ],
  "Jazz & Swing": ["Jazz", "Swing", "Jazz Fusion", "Jazz Rock"],
  "Folk & Acoustic": [
    "Folk",
    "Folk Rock",
    "Country",
    "Country Pop",
    "Country Rock",
    "Bluegrass",
    "Ska",
    "Acoustic",
  ],
  Latin: ["Latin", "Latin Pop", "Latin Rock", "Salsa"],
  Classical: ["Classical", "Instrumental"],
  Other: [],
};

const categorizeGenre = (genre) => {
  const g = String(genre || "").trim().toLowerCase();
  for (const [category, values] of Object.entries(genreMap)) {
    if (values.some((v) => String(v).toLowerCase() === g)) return category;
  }
  return "Other";
};

const normalize = (str) => String(str || "").trim().toLowerCase();
const isSameSong = (a, b) =>
  normalize(a?.title) === normalize(b?.title) &&
  normalize(a?.artist) === normalize(b?.artist);

const getYearNumber = (year) => {
  const raw = String(year || "").trim();
  const first4 = raw.slice(0, 4);
  const n = parseInt(first4, 10);
  return Number.isFinite(n) ? n : null;
};

const MusicianRepertoire = ({
  selectedSongs,
  actData,
  favourites,
  toggleFavourite,
}) => {
  const [filter, setFilter] = useState({
    decade: "",
    genre: "",
    artist: "",
    search: "",
  });

  // Only use selectedSongs from the musician model
  const songsSource = Array.isArray(selectedSongs) ? selectedSongs : [];

  // Only use genreMap for filter dropdowns
  const genreCategories = Object.keys(genreMap).filter((cat) => cat !== "Other");

  const musicianName = useMemo(() => {
    const fullName = `${actData?.firstName || ""} ${actData?.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim();

    return fullName || actData?.tscName || "Musician";
  }, [actData]);

  const filteredSongs = useMemo(() => {
    let result = [...songsSource];

    // Decade filter (properly supports ≤1969)
    if (filter.decade) {
      const decade = filter.decade;

      result = result.filter((song) => {
        const y = getYearNumber(song.year);
        if (!y) return false;

        if (decade === "pre1970") return y <= 1969;

        const start = parseInt(decade, 10); // e.g. "1970"
        if (!Number.isFinite(start)) return true;
        return y >= start && y <= start + 9;
      });
    }

    // Genre filter (maps song.genre -> category)
    if (filter.genre) {
      result = result.filter((song) => {
        const raw = String(song.genre || "").trim();
        if (!raw) return filter.genre === "Other";

        const categories = raw
          .split("/")
          .map((g) => categorizeGenre(String(g).trim()));

        return categories.includes(filter.genre);
      });
    }

    // Artist filter
    if (filter.artist) {
      const needle = normalize(filter.artist);
      result = result.filter((song) => normalize(song.artist).includes(needle));
    }

    // Search filter (title OR artist)
    if (filter.search) {
      const needle = normalize(filter.search);
      result = result.filter(
        (song) =>
          normalize(song.title).includes(needle) ||
          normalize(song.artist).includes(needle)
      );
    }

    // Nice UX: consistent ordering
    result.sort((a, b) => {
      const aArtist = normalize(a.artist);
      const bArtist = normalize(b.artist);
      if (aArtist !== bArtist) return aArtist.localeCompare(bArtist);

      const aTitle = normalize(a.title);
      const bTitle = normalize(b.title);
      if (aTitle !== bTitle) return aTitle.localeCompare(bTitle);

      const ay = getYearNumber(a.year) || 0;
      const by = getYearNumber(b.year) || 0;
      return ay - by;
    });

    return result;
  }, [songsSource, filter]);

  const showingLimit = 100;
  const visibleSongs = filteredSongs.slice(0, showingLimit);

  return (
    <div className="flex gap-6 items-start w-full">
      <div className="w-full">
        <div className="text-2xl">
          <Title
            text1={getPossessiveTitleCase(musicianName)}
            text2="REPERTOIRE"
          />
        </div>

        <p className="text-gray-600 text-[17px] mt-2 mb-4 p-2">
          Use the filters below to explore {musicianName}
          &apos;s repertoire of {songsSource.length} songs.
        </p>

        <div className="grid grid-cols-4 gap-3 mb-4 mt-2 w-full">
          <select
            className="border px-2 py-1 rounded-l text-gray-600 text-[17px]"
            value={filter.decade}
            onChange={(e) => setFilter({ ...filter, decade: e.target.value })}
          >
            <option value="">All Decades</option>
            <option value="pre1970">≤ 1969</option>
            <option value="1970">1970s</option>
            <option value="1980">1980s</option>
            <option value="1990">1990s</option>
            <option value="2000">2000s</option>
            <option value="2010">2010s</option>
            <option value="2020">2020s</option>
          </select>

          <select
            className="border px-2 py-1 rounded text-gray-600 text-[17px]"
            value={filter.genre}
            onChange={(e) => setFilter({ ...filter, genre: e.target.value })}
          >
            <option value="">All Genres</option>
            {genreCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>

          <input
            type="text"
            placeholder="Artist"
            className="border px-2 py-1 rounded text-gray-600 text-[17px]"
            value={filter.artist}
            onChange={(e) => setFilter({ ...filter, artist: e.target.value })}
          />

          <input
            type="text"
            placeholder="Search title"
            className="border px-2 py-1 rounded text-gray-600 text-[17px]"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between text-gray-600 text-[15px] mb-2 px-1">
          <span>
            Showing {Math.min(filteredSongs.length, showingLimit)} of{" "}
            {filteredSongs.length} matching songs
          </span>
          {(filter.decade || filter.genre || filter.artist || filter.search) && (
            <button
              type="button"
              onClick={() =>
                setFilter({ decade: "", genre: "", artist: "", search: "" })
              }
              className="text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-scroll border rounded p-3 bg-white">
          {visibleSongs.length === 0 ? (
            <div className="text-gray-500 text-[16px] py-6 text-center">
              No songs match your filters.
            </div>
          ) : (
            visibleSongs.map((song, idx) => {
              const favourited = favourites?.some((fav) => isSameSong(fav, song));

              return (
                <div
                  key={`${song.title}-${song.artist}-${idx}`}
                  className="flex justify-between items-center border-b py-1 text-gray-600 text-[17px]"
                >
                  <span className="pr-3">
                    {song.title} – {song.artist}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleFavourite(song)}
                    className="hover:opacity-80 focus:outline-none"
                    aria-label={favourited ? "Remove from favourites" : "Add to favourites"}
                    title={favourited ? "Favourited" : "Shortlist this song"}
                  >
                    <img
                      src={favourited ? assets.heart_icon : assets.shortlist_icon}
                      alt={favourited ? "Song shortlisted" : "Shortlist this song"}
                      className="w-4 h-4 md:w-6 md:h-6"
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {filteredSongs.length > showingLimit && (
          <p className="text-gray-500 text-[14px] mt-2">
            (Showing the first {showingLimit}. Refine filters to narrow results.)
          </p>
        )}
      </div>
    </div>
  );
};

MusicianRepertoire.propTypes = {
  selectedSongs: PropTypes.array, // can be undefined while loading
  actData: PropTypes.object,
  favourites: PropTypes.array.isRequired,
  toggleFavourite: PropTypes.func.isRequired,
};

export default MusicianRepertoire;