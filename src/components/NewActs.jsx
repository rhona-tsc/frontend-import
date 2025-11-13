import React, { useContext, useEffect, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";
import ActItem from "./ActItem";

const NewActs = () => {
  const { acts, userId, shortlistAct, shortlistItems } = useContext(ShopContext);
  const [newestActs, setNewestActs] = useState([]);
  const [maxToShow, setMaxToShow] = useState(10); // default for desktop

  // 🔹 detect tablet screen
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 640 && width < 1024) {
        setMaxToShow(8); // tablet: show 8
      } else {
        setMaxToShow(10); // desktop: show 10
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isShortlisted = (actId) => shortlistItems.includes(actId);

  useEffect(() => {
    const approvedActs = acts.filter(
      (act) =>
        act.status === "approved" || act.status === "Approved, changes pending"
    );

    const calculatePrice = (act) => {
      if (!act?.lineups?.length) return null;
      const sorted = [...act.lineups].sort(
        (a, b) => (a.bandMembers?.length || 0) - (b.bandMembers?.length || 0)
      );
      const smallest = sorted[0];
      if (!smallest?.bandMembers) return null;
      const essentialFees = smallest.bandMembers.flatMap((m) => {
        const fees = [];
        if (m.isEssential && typeof m.fee === "number") fees.push(m.fee);
        m.additionalRoles?.forEach((r) => {
          if (r.isEssential && typeof r.additionalFee === "number") fees.push(r.additionalFee);
        });
        return fees;
      });
      const total = essentialFees.reduce((s, f) => s + f, 0);
      return total ? Math.ceil(total / 0.75) : null;
    };

    const updatedActs = approvedActs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, maxToShow)
      .map((act) => ({ ...act, formattedPrice: calculatePrice(act) }));

    setNewestActs(updatedActs);
  }, [acts, maxToShow]);

  return (
    <div className="my-10">
      <div className="text-center py-8 text-3xl">
        <Title text1="NEW" text2="ACTS" />
        <p className="w-3.4 m-auto text-xs sm:text-md md:text-base text-gray-600">
          Our most recent additions to The Supreme Collective, raring to make your event stellar.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
        {newestActs.map(
          (item) =>
            item?.lineups?.length > 0 && (
              <ActItem
                key={item._id}
                actData={item}
                isShortlisted={isShortlisted(item._id)}
                onShortlistToggle={() => shortlistAct(userId, item._id)}
                price={item.formattedPrice}
              />
            )
        )}
      </div>
    </div>
  );
};

export default NewActs;