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
  const { actCards } = useContext(ShopContext); // now cards
  const deferredCards = useDeferredValue(actCards);
  const maxToShow = useMaxToShow();

  useEffect(() => {
  console.log("actCards[0] keys:", Object.keys(actCards?.[0] || {}));
  console.log("sample createdAt:", actCards?.slice(0,5).map(a => ({ name: a?.tscName || a?.name, createdAt: a?.createdAt })));
}, [actCards]);

const newestSlice = useMemo(() => {
  const list = Array.isArray(deferredCards) ? [...deferredCards] : [];
  list.sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : new Date(String(a?.actId || a?._id).slice(0, 8) + "0000000000000000").getTime();
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : new Date(String(b?.actId || b?._id).slice(0, 8) + "0000000000000000").getTime();
    return tb - ta;
  });
  return list.slice(0, maxToShow);
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
            key={String(item.actId || item._id || item.id)}
            style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
          >
            <ActItem 
             actData={{
                    ...item,
        
                      loveCount: Number(
  item.loveCount ??
  item.timesShortlisted ??
  item.numberOfShortlistsIn ??
  item.shortlistCount ??
  0
) || 0,
                    }}
             />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewActs;