import { assets } from "../assets/assets";
import { Link } from "react-router-dom";
import { locationPages } from '../data/locationPages.js';

const Footer = () => {
  return (
    <div>
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-5 text-sm">
        <div>
          <img src={assets.logo} className="mb-5 w-60" alt="The Supreme Collective" />
          <p className="w-full md:w-2/3 text-gray-600">
            Live bands and live music for weddings | parties | corporate events
            | awards ceremonies | summer balls | winter staff parties |
            anniversaries | memorials | Israeli weddings | bar & batmitzvahs |
            ceremonies | drinks receptions | evening receptions | club nights |
            birthday parties | retirement parties | product launches | sporting
            events | festivals | NYE celebrations & more
          </p>
        </div>

        <div>
          <p className="text-xl font-medium mb-5">COMPANY</p>
          <ul className="flex flex-col gap-1 text-gray-600">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about/">About Us</Link></li>
            <li><Link to="/venues/">Venue Guide</Link></li>
            <li><Link to="/terms/">Terms & Conditions</Link></li>
            <li><Link to="/privacy/">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xl font-medium mb-5">GET IN TOUCH</p>
          <ul className="flex flex-col gap-1 text-gray-600">
            <li>+44 203 576 5322</li>
            <li>+44 7594 223200</li>
            <li>hello@thesupremecollective.co.uk</li>
          </ul>
        </div>
      </div>

      <nav className="mb-10 w-full" aria-label="Wedding band location quick links">
        <p className="mb-4 text-xl font-medium">QUICK LINKS</p>
        <div className="flex w-full flex-wrap items-center gap-y-2 text-sm text-gray-600">
          {locationPages.map(({ slug, name }, index) => (
            <span key={slug} className="inline-flex items-center whitespace-nowrap">
              <Link
                to={`/wedding-bands-${slug}/`}
                className="transition-colors hover:text-black"
              >
                Wedding bands in {name}
              </Link>
              {index < locationPages.length - 1 && (
                <span className="mx-2 text-gray-400" aria-hidden="true">|</span>
              )}
            </span>
          ))}
        </div>
      </nav>

      <div>
        <hr />
        <p className="py-5 text-sm text-center">
          Copyright 2025@ thesupremecollective.co.uk - All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default Footer;
