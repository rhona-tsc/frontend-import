import React, { useState } from "react";
import MusicianRepertoire from "./MusicianRepertoire";
import MusicianSongSuggestions from "./MusicianSongSuggestions";

const MusicianRepertoireSection = ({ selectedSongs, actData, addToCart }) => {
  const [favourites, setFavourites] = useState([]);

  const toggleFavourite = (song) => {
    const exists = favourites.some(
      (fav) => fav.title === song.title && fav.artist === song.artist
    );
    if (exists) {
      setFavourites((prev) =>
        prev.filter(
          (fav) => fav.title !== song.title || fav.artist !== song.artist
        )
      );
    } else {
      setFavourites((prev) => [...prev, song]);
    }
  };

  return (
   <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
  <div className="w-full lg:w-[60%] order-1">
    <MusicianRepertoire
      selectedSongs={Array.isArray(selectedSongs) ? selectedSongs : []}
      actData={actData}
      favourites={favourites}
      toggleFavourite={toggleFavourite}
    />
  </div>
  <div className="w-full lg:w-[40%] order-2">
    <MusicianSongSuggestions
      favourites={favourites}
      actData={actData}
      toggleFavourite={toggleFavourite}
      addToCart={addToCart}
    />
  </div>
</div>
  );
};

export default MusicianRepertoireSection;