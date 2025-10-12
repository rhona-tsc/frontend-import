import React, { useContext, useState, useEffect } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";
import ActItem from "./ActItem";

const BestSeller = () => {
  const [bestSeller, setBestSeller] = useState([]);
  const [maxToShow, setMaxToShow] = useState(5); // default for desktop
  const { acts, userId, shortlistAct, isShortlisted } = useContext(ShopContext);

  // 🔹 detect screen size and limit items
  useEffect(() => {
    const updateLimit = () => {
      const width = window.innerWidth;
      if (width < 640) setMaxToShow(4); // phones
      else if (width < 1024) setMaxToShow(4); // tablets
      else setMaxToShow(5); // desktop
    };
    updateLimit();
    window.addEventListener("resize", updateLimit);
    return () => window.removeEventListener("resize", updateLimit);
  }, []);

  // 🔹 Build bestsellers with fallback
  useEffect(() => {
    const list = Array.isArray(acts) ? acts : [];
    const approvedActs = list.filter(
      (a) => a?.status === "approved" || a?.status === "Approved, changes pending"
    );

    let flagged = approvedActs.filter(
      (a) => Boolean(a?.bestseller) || Boolean(a?.bestSeller)
    );

    if (flagged.length === 0) {
      const byPopularity = [...approvedActs].sort(
        (A, B) => (B?.timesShortlisted || 0) - (A?.timesShortlisted || 0)
      );
      flagged = byPopularity.slice(0, maxToShow);
    } else {
      flagged = flagged.slice(0, maxToShow);
    }

    setBestSeller(flagged);
  }, [acts, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center text-3xl py-8">
        <Title text1="YOUR" text2="FAVES" />
        <p className="w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600">
          Make your life as easy as possible. Cut to the chase and book the
          cream of the crop.
        </p>
      </div>

      {bestSeller.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No featured acts yet.</p>
      ) : (
        // ✅ Responsive layout
        <div
          className="
            grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5
            gap-4 gap-y-6
            justify-center
          "
        >
          {bestSeller.map((item) => (
            <ActItem
              key={item._id}
              actData={item}
              isShortlisted={isShortlisted(item._id)}
              onShortlistToggle={() => shortlistAct(userId, item._id)}
              price={item.formattedPrice}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BestSeller;