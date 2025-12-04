import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import CustomToast from './CustomToast';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import calculateActPricing from '../pages/utils/pricing';
import { ShopContext } from '../context/ShopContext';
import useOnScreen from '../hooks/useOnScreen';
import { priceCache, makePriceKey } from '../pages/utils/priceCache';
import useRenderTracker from '../hooks/useRenderTracker'; // 👈 add this import

const ActItem = ({ actData, shortlistCount }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const cardRef = React.useRef(null);
  const isOnScreen = useOnScreen(cardRef);
  const [isAnimating, setIsAnimating] = useState(false);

  

  // ✅ render tracker — place after you have basic props you want to log
  useRenderTracker('ActItem', {
    actId: actData?._id,
    name: actData?.tscName,
    hasLineups: !!actData?.lineups?.length,
    shortlisted: !!shortlistCount,
    onScreen: isOnScreen,
  });





  return (
    <div ref={cardRef} className="relative group">
      <Link
        to={`/act/${actData?._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="block text-gray-700"
      >
        <div className="overflow-hidden h-full w-full">
          {(() => {
            const resolvedImage =
              (actData?.profileImage?.[0]?.url || '/placeholder.jpg');

            return (
              <img
                loading="lazy"
                className="h-full w-full object-cover hover:scale-110 transition ease-in-out"
                src={resolvedImage}
                alt={actData?.tscName || 'Act'}
              />
            );
          })()}
        </div>

        <div className="flex justify-between items-center pt-3 pb-1">
          <div className="min-h-[40px] flex flex-col justify-center">
            <p className="text-sm">{actData?.tscName}</p>
          
          </div>

         
        </div>
      </Link>
    </div>
  );
};


function areEqualActItem(prev, next) {
  const p = prev.actData || {};
  const n = next.actData || {};

  // Use only the fields the card actually renders/needs
  const sameId = String(p._id) === String(n._id);
  const sameName = (p.tscName || p.name) === (n.tscName || n.name);
  const sameImg =
    (p.profileImage?.[0]?.url || "") === (n.profileImage?.[0]?.url || "");
  const sameLineupCount = (p.lineups?.length || 0) === (n.lineups?.length || 0);
  const sameTimesShortlisted =
    (p.timesShortlisted ?? 0) === (n.timesShortlisted ?? 0);
  const sameFormattedPrice =
    (p.formattedPrice?.total ?? null) === (n.formattedPrice?.total ?? null);
  const sameShortlistCount = (prev.shortlistCount ?? 0) === (next.shortlistCount ?? 0);

  return (
    sameId &&
    sameName &&
    sameImg &&
    sameLineupCount &&
    sameTimesShortlisted &&
    sameFormattedPrice &&
    sameShortlistCount
  );
}

export default React.memo(ActItem, areEqualActItem);