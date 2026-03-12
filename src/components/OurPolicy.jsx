import React from 'react';
import { assets } from '../assets/assets';

const OurPolicy = () => {
  return (
    <div className="px-4 py-16">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 text-center text-xs sm:text-sm md:text-base text-gray-700 items-start">
        <div className="flex flex-col items-center max-w-sm mx-auto">
          <img src={assets.exchange_icon} className="w-12 h-12 mb-5" alt="Superior act management" />
          <p className="font-semibold mb-2">Superior Act Management</p>
          <p className="text-gray-400 leading-6">
            We are here to make sure your entertainment is seamlessly integrated into your special day.
          </p>
        </div>

        <div className="flex flex-col items-center max-w-sm mx-auto">
          <img src={assets.quality_icon} className="w-12 h-12 mb-5" alt="Quality acts" />
          <p className="font-semibold mb-2">Quality Acts</p>
          <p className="text-gray-400 leading-6">
            With over a hundred 5-star Google Reviews and gushing clients up and down the country you can rest assured you're in experienced hands.
          </p>
        </div>

        <div className="flex flex-col items-center max-w-sm mx-auto">
          <img src={assets.support_img} className="w-12 h-12 mb-5" alt="Full support policy" />
          <p className="font-semibold mb-2">Full Support Policy</p>
          <p className="text-gray-400 leading-6">
            We are here to support you from start to finish, every step of the way.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OurPolicy;
