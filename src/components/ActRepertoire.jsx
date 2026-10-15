import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { assets } from '../assets/assets';
import Title from './Title';
import { getPossessiveTitleCase } from '../pages/utils/getPossessiveTitleCase';

const genreMap = {
  "Funk & Disco": ["Funk", "Disco", "Jazz Funk", "Jazz Fusion", "Fusion"],
  "RnB, HipHop & Garage": ["Hip-Hop", "R&B", "Rap", "UK Garage", "Garage Rock", "Proto-Punk"],
  "Alternative & Punk": ["Alternative", "Alternative Rock", "Alternative Metal", "Nu Metal", "Punk", "Punk Rock", "Post-Punk", "Proto-Punk"],
  "Indie & Rock": ["Indie", "Indie Rock", "Indie Folk", "Indie Pop", "Pop Rock", "Soft Rock", "Rock", "Southern Rock", "Surf Rock", "Glam Rock", "Garage Rock", "Hard Rock", "Jazz Rock", "Latin Rock"],
  "Dance & Electronic": ["Dance", "Dance Pop", "Dance-Pop", "Electronic", "Electropop", "EDM", "Eurodance", "House", "Drum and Bass", "Trip-Hop", "Synthpop", "Tropical House", "Electronic Dance Music"],
  "Reggae & Afrobeat": ["Afrobeat", "Afrobeats", "Reggae", "Reggaeton", "Reggae Fusion", "Dancehall"],
  "Soul & Motown": ["Soul", "Motown", "Bossa Nova"],
  "Pop & Classic Pop": ["Pop", "Pop Rock", "Pop Ballad", "Pop Punk", "Comedy", "Showtunes", "Musical", "Disney"],
  "Jazz & Swing": ["Jazz", "Swing", "Jazz Fusion", "Jazz Rock"],
  "Folk & Acoustic": ["Folk", "Folk Rock", "Country", "Country Pop", "Country Rock", "Bluegrass", "Ska", "Acoustic"],
  "Latin": ["Latin", "Latin Pop", "Latin Rock", "Salsa"],
  "Classical": ["Classical", "Instrumental"],
  "Other": []
};

const categorizeGenre = (genre) => {
  genre = genre.trim().toLowerCase();
  for (const [category, values] of Object.entries(genreMap)) {
    if (values.some((g) => g.toLowerCase() === genre)) return category;
  }
  return 'Other';
};

const parseCustomRepertoire = (text) => {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  let currentGenre = '';
  const parsedSongs = [];

  lines.forEach((line) => {
    if (/^[A-Z][a-zA-Z\s/&+]+$/.test(line) && !line.includes('-') && line.length < 40) {
      currentGenre = line;
    } else {
      const match = line.match(/^(\d{4})?\s?-?\s?(.*?)\s*-\s*(.+)$/);
      if (match) {
        const year = match[1] ? parseInt(match[1], 10) : null;
        const title = match[2].trim();
        const artist = match[3].trim();

        parsedSongs.push({ title, artist, genre: currentGenre || 'Other', year });
      }
    }
  });

  return parsedSongs;
};

const ActRepertoire = ({
  selectedSongs,
  actData,
  favourites = [],
  toggleFavourite = () => {},
  showHeader = true,
  showIntro = true,
  interactive = true,
}) => {
  const [filter, setFilter] = useState({ decade: '', genre: '', artist: '', search: '' });
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [visibleLimit, setVisibleLimit] = useState(100);

  const genreCategories = Object.keys(genreMap).filter((cat) => cat !== 'Other');

  useEffect(() => {
    if (!selectedSongs || !Array.isArray(selectedSongs)) {
      setFilteredSongs([]);
      return;
    }

    let result = [...selectedSongs];

    if (filter.decade) {
      result = result.filter((song) => {
        const rawYear = song?.year;
        if (rawYear == null || String(rawYear).trim() === '') return false;

        const year = Number(rawYear);
        if (!Number.isFinite(year)) return false;
        if (filter.decade === 'pre1970') return year <= 1969;

        const decadeStart = Number(filter.decade);
        return year >= decadeStart && year < decadeStart + 10;
      });
    }

    if (filter.genre) {
      result = result.filter((song) =>
        String(song?.genre || '')
          .split('/')
          .map((g) => categorizeGenre(g.trim()))
          .includes(filter.genre)
      );
    }

    if (filter.artist) {
      result = result.filter((song) =>
        String(song?.artist || '').toLowerCase().includes(filter.artist.toLowerCase())
      );
    }

    if (filter.search) {
      result = result.filter((song) =>
        String(song?.title || '').toLowerCase().includes(filter.search.toLowerCase()) ||
        String(song?.artist || '').toLowerCase().includes(filter.search.toLowerCase())
      );
    }

    setFilteredSongs(result);
    setVisibleLimit(100);
  }, [filter, selectedSongs]);

  return (
    <div className="flex gap-6 items-start w-full">
      <div className="">
        {showHeader && (
          <div className="text-2xl">
            <Title text1={getPossessiveTitleCase(actData?.tscName)} text2="REPERTOIRE" />
          </div>
        )}

        {showIntro && (
          <p className="text-gray-600 text-[17px] mt-2 mb-4 p-2">
            Use the filters below to explore {actData?.tscName || 'the act'}’s repertoire of {selectedSongs?.length || ''} songs and find your favourites. Heart the songs from {actData?.tscName || 'the act'}’s repertoire that you’d love to hear, pop them in the cart and we’ll pass them to {actData?.tscName || 'the act'} upon booking — and don’t worry, you’ll still be able to amend your favourite song suggestions after booking too!
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 mt-2 w-full">
          <select
            aria-label="Filter repertoire by decade"
            className="w-full border px-2 py-1 rounded text-gray-600 text-[17px]"
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
            aria-label="Filter repertoire by genre"
            className="w-full border px-2 py-1 rounded text-gray-600 text-[17px]"
            value={filter.genre}
            onChange={(e) => setFilter({ ...filter, genre: e.target.value })}
          >
            <option value="">All Genres</option>
            {genreCategories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>

          <input
            type="text"
            placeholder="Artist"
            aria-label="Filter repertoire by artist"
            className="w-full border px-2 py-1 rounded text-gray-600 text-[17px]"
            value={filter.artist}
            onChange={(e) => setFilter({ ...filter, artist: e.target.value })}
          />

          <input
            type="text"
            placeholder="Search title"
            aria-label="Search repertoire by song title"
            className="w-full border px-2 py-1 rounded text-gray-600 text-[17px]"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>

        <div className="max-h-80 overflow-y-auto border rounded p-3 bg-white md:p-4">
          {filteredSongs.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-[15px] md:text-[17px]">
              There aren’t any songs that match your filters right now — remove or adjust some filters to see more songs.
            </div>
          ) : (
            filteredSongs.slice(0, visibleLimit).map((song, idx) => (
              <div
                key={`${song.title}-${song.artist}-${idx}`}
                className={`${interactive ? 'grid grid-cols-[1fr_auto]' : 'block'} items-center gap-3 border-b py-2 text-gray-600 text-[15px] md:text-[17px]`}
              >
                <span className="break-words leading-snug pr-1">
                  {song.title} – {song.artist}
                </span>

                {interactive && (
                  <button
                    type="button"
                    onClick={() => toggleFavourite(song)}
                    className="justify-self-end shrink-0 min-w-[28px] md:min-w-[32px] p-0 text-red-500 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6667]"
                    aria-pressed={favourites.some((fav) => fav.title === song.title && fav.artist === song.artist)}
                    aria-label={
                      favourites.some((fav) => fav.title === song.title && fav.artist === song.artist)
                        ? `Remove ${song.title} by ${song.artist} from favourites`
                        : `Add ${song.title} by ${song.artist} to favourites`
                    }
                  >
                    {favourites.some((fav) => fav.title === song.title && fav.artist === song.artist) ? (
                      <img
                        src={assets.heart_icon}
                        alt=""
                        className="w-6 h-6 md:w-7 md:h-7"
                      />
                    ) : (
                      <img
                        src={assets.shortlist_icon}
                        alt=""
                        className="w-6 h-6 md:w-7 md:h-7"
                      />
                    )}
                  </button>
                )}
              </div>
            ))
          )}

          {filteredSongs.length > visibleLimit && (
            <button
              type="button"
              onClick={() => setVisibleLimit((current) => current + 100)}
              className="mt-3 w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6667]"
            >
              Show more ({filteredSongs.length - visibleLimit} remaining)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ActRepertoire.propTypes = {
  selectedSongs: PropTypes.array.isRequired,
  actData: PropTypes.object,
  favourites: PropTypes.array,
  toggleFavourite: PropTypes.func,
  showHeader: PropTypes.bool,
  showIntro: PropTypes.bool,
  interactive: PropTypes.bool,
};

export { ActRepertoire as default, parseCustomRepertoire, categorizeGenre, genreMap };
