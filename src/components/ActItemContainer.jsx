// src/components/ActItemContainer.jsx
import React from "react";
import { ShopContext } from "../context/ShopContext";
import ActItem from "./ActItem";

function areEqualAct(prev, next) {
  const a = prev.act || {};
  const b = next.act || {};
  const sameId = String(a._id) === String(b._id);
  const sameName = (a.tscName || a.name) === (b.tscName || b.name);
  const sameImg = (a.profileImage?.[0]?.url || "") === (b.profileImage?.[0]?.url || "");
  const sameLineups = (a.lineups?.length || 0) === (b.lineups?.length || 0);
  const samePrice = (a.formattedPrice ?? null) === (b.formattedPrice ?? null);
  const sameShortlists =
    (a.metrics?.shortlists ?? a.timesShortlisted ?? 0) ===
    (b.metrics?.shortlists ?? b.timesShortlisted ?? 0);
  return sameId && sameName && sameImg && sameLineups && samePrice && sameShortlists;
}

const ActItemContainer = React.memo(function ActItemContainer({ act }) {
  const {
    shortlistedActs,
    shortlistAct,
    userId,
    isShortlisted: isShortlistedFn, // some codebases expose a helper
  } = React.useContext(ShopContext);

  const shortlistCount = React.useMemo(
    () => act?.metrics?.shortlists ?? act?.timesShortlisted ?? 0,
    [act?.metrics?.shortlists, act?.timesShortlisted]
  );

  const isShortlisted = React.useMemo(() => {
    if (typeof isShortlistedFn === "function") return !!isShortlistedFn(act._id);
    return Array.isArray(shortlistedActs) && shortlistedActs.includes(String(act._id));
  }, [isShortlistedFn, shortlistedActs, act._id]);

  const onShortlistToggle = React.useCallback(() => {
    if (!userId) return; // your ActItem may already prompt login
    return shortlistAct(userId, act._id);
  }, [shortlistAct, userId, act._id]);

  return (
    <ActItem
      actData={act}
      shortlistCount={shortlistCount}
      isShortlisted={isShortlisted}
      onShortlistToggle={onShortlistToggle}
      price={act.formattedPrice}
    />
  );
}, areEqualAct);

export default ActItemContainer;