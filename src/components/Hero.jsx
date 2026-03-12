import React from 'react';
import { assets } from '../assets/assets';

const Hero = ({ children }) => {
  return (
    <div className="mt-16 flex flex-col sm:flex-row border border-gray-200 border-t-0 bg-white overflow-hidden">
      {/* Hero Left Side */}
      <div className="w-full sm:w-1/2 flex items-center justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="text-[#414141] max-w-xl w-full">
          <div className="flex items-center gap-2 mb-3">
            <p className="w-8 md:w-11 h-[2px] bg-[#414141]"></p>
            <p className="font-medium text-sm md:text-base tracking-[0.12em]">
              BOOK NOW
            </p>
          </div>

          <h1 className="prata-regular text-3xl sm:text-4xl lg:text-5xl leading-tight sm:leading-tight lg:leading-[1.1]">
            Exceptional Event & Wedding Bands for Hire
          </h1>

          <p className="mt-4 text-sm sm:text-base text-gray-600 leading-7 max-w-lg">
            Discover standout live entertainment for weddings, parties and
            corporate events, with flexible line-ups, trusted musicians and a
            seamless booking experience.
          </p>

          <div className="flex items-center gap-2 mt-5 mb-5">
            <p className="font-semibold text-sm md:text-base">
              LET&apos;S GET THIS PARTY STARTED
            </p>
            <p className="w-8 md:w-11 h-[1px] bg-[#414141]"></p>
          </div>

          {children}
        </div>
      </div>

      {/* Hero Right Side */}
      <div className="w-full sm:w-1/2 h-[240px] sm:h-[420px] lg:h-auto">
        <img
          className="w-full h-full object-cover"
          src={assets.hero_img}
          alt="Live wedding and event band performing"
        />
      </div>
    </div>
  );
};

export default Hero;