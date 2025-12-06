import React, {
  useContext, useEffect, useMemo, useState, useDeferredValue
} from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";
import ActItem from "./ActItem";

const DBG = false;
const log = (...a) => DBG && console.log("🆕[NewActs]", ...a);

function useMaxToShow() {
  const [maxToShow, setMaxToShow] = useState(10);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqTablet = window.matchMedia("(min-width:640px) and (max-width:1023.98px)");
    const update = () => setMaxToShow(mqTablet.matches ? 8 : 10);
    update();
    mqTablet.addEventListener("change", update);
    return () => mqTablet.removeEventListener("change", update);
  }, []);
  return maxToShow;
}

const NewActs = () => {
  const { actCards, getCardPriceWithTravel, selectedAddress, selectedDate  } = useContext(ShopContext); // now cards
  const deferredCards = useDeferredValue(actCards);
  const maxToShow = useMaxToShow();

  // Server already sorts by -createdAt; just slice here
  const newestSlice = useMemo(() => {
    const list = Array.isArray(deferredCards) ? deferredCards : [];
    const sliced = list.slice(0, maxToShow);
    log("slice len:", sliced.length);
    return sliced;
  }, [deferredCards, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center py-8 text-3xl">
        <Title text1="NEW" text2="ACTS" />
        <p className="w-3.4 m-auto text-xs sm:text-md md:text-base text-gray-600">
          Our most recent additions to The Supreme Collective, raring to make your event stellar.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
        {newestSlice.map((item) => (
          <div
            key={String(item.actId || item._id)}
            style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
          >
            <ActItem actData={item} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewActs;