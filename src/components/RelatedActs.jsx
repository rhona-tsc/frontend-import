// src/components/RelatedActs.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import Title from "./Title";
import { ShopContext } from "../context/ShopContext";
import ActItemContainer from "./ActItemContainer"; // 👈 use the container

const RelatedActs = ({ genres = [], instruments = [], vocalist = "", currentActId }) => {
  const { acts } = useContext(ShopContext);

  const [related, setRelated] = useState([]);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    try { mq.addEventListener("change", onChange); } catch { mq.addListener(onChange); }
    return () => {
      try { mq.removeEventListener("change", onChange); } catch { mq.removeListener(onChange); }
    };
  }, []);

  // price calc (unchanged)
  const calculatePrice = (act) => {
    if (!act || !Array.isArray(act.lineups)) return null;
    const smallest = act.lineups.reduce((s, c) =>
      (c.bandMembers?.length || 0) < (s?.bandMembers?.length || Infinity) ? c : s, null
    );
    if (!smallest || !Array.isArray(smallest.bandMembers)) return null;
    const essentialFees = smallest.bandMembers.flatMap((m) => {
      const base = m.isEssential ? Number(m.fee) || 0 : 0;
      const addl = (m.additionalRoles || [])
        .filter((r) => r.isEssential)
        .map((r) => Number(r.additionalFee) || 0);
      return [base, ...addl];
    });
    const totalFee = essentialFees.reduce((sum, f) => sum + f, 0);
    return Math.ceil(totalFee / 0.8); // +20%
  };

  useEffect(() => {
    if (acts.length === 0 || genres.length === 0) return;
    let filtered = acts.filter(
      (a) => a._id !== currentActId && a.status === "approved"
    );

    const genreMatchCnt = (gs) =>
      Array.isArray(gs) ? gs.filter((g) => genres.includes(g)).length : 0;
    const hasInstrument = (ins) =>
      Array.isArray(ins) && ins.some((i) => instruments.includes(i));
    const hasVocal = (v) => (vocalist ? v === vocalist : false);

    filtered.sort((a, b) => {
      const gA = genreMatchCnt(a.genre), gB = genreMatchCnt(b.genre);
      const vA = hasVocal(a.vocalist) ? 1 : 0;
      const vB = hasVocal(b.vocalist) ? 1 : 0;
      const iA = hasInstrument(a.instruments) ? 1 : 0;
      const iB = hasInstrument(b.instruments) ? 1 : 0;
      return (gB - gA) || (vB - vA) || (iB - iA);
    });

    const updated = filtered.slice(0, 5).map((act) => ({
      ...act,
      formattedPrice: calculatePrice(act),
    }));
    setRelated(updated);
  }, [acts, genres, instruments, vocalist, currentActId]);

  const itemsToRender = useMemo(
    () => (isDesktop ? related : related.slice(0, 4)),
    [isDesktop, related]
  );

  return (
    <div>
      <div className="text-center text-3xl py-2 mt-12">
        <Title text1={"SIMILAR"} text2={"ACTS"} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {itemsToRender.length > 0 ? (
          itemsToRender.map((item) => (
            <ActItemContainer key={item._id} act={item} /> 
          ))
        ) : (
          <p className="text-center text-gray-500 mt-5">No similar acts found.</p>
        )}
      </div>
    </div>
  );
};

export default RelatedActs;