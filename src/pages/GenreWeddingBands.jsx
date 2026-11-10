import PropTypes from 'prop-types';
import { cloudinaryImage } from '../utils/cloudinaryImage.js';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import { genrePages, genreMeta } from '../data/genrePages.js';
import { locationPages } from '../data/locationPages.js';
import { buildPageSchema, serializeSchema } from '../utils/structuredData.js';

export function GenreWeddingBandsContent({ slug }) {
  const page = genrePages.find(item => item.slug === slug);
  return <main className="mx-auto max-w-6xl pb-16 pt-6">
    <section className="rounded-[2rem] bg-black px-6 py-12 text-white sm:px-10 sm:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#ff6677]">Find your live soundtrack</p>
      <h1 className="text-4xl font-semibold sm:text-5xl">{page.name}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-200">{page.intro}</p>
      <div className="mt-8 flex flex-wrap gap-4"><a href="#compare-bands" className="rounded-full bg-white px-6 py-3 font-semibold text-black">{page.bands.length === 1 ? 'Meet Gotta Be Garage' : 'Compare the bands'}</a><Link to="/contact/" className="rounded-full border border-white px-6 py-3 font-semibold">Ask about your wedding</Link></div>
    </section>
    <section id="compare-bands" className="mt-12 scroll-mt-24">
      <h2 className="text-3xl font-semibold">{page.bands.length === 1 ? 'Meet the UK garage band' : 'Compare your funk and soul bands'}</h2>
      <p className="mt-4 max-w-4xl leading-8 text-gray-700">{page.guidance}</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-left text-sm"><caption className="sr-only">Band styles and lineup choices</caption>
          <thead className="bg-gray-100"><tr>{['Band', 'Music', 'Lineup choices', 'Consider for'].map(label => <th key={label} scope="col" className="p-4">{label}</th>)}</tr></thead>
          <tbody>{page.bands.map(band => <tr key={band.slug} className="border-t border-gray-200"><th scope="row" className="p-4"><Link className="underline" to={`/act/${band.slug}/`}>{band.name}</Link></th><td className="p-4">{band.style}</td><td className="p-4">{band.lineup}</td><td className="p-4">{band.fit}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-600">Lineup options vary by act. Confirm the exact singers and instruments, availability and package for your wedding.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">{page.bands.map(band => <article key={band.slug} className="rounded-3xl border border-gray-200 p-6">
        {band.image && <Link to={`/act/${band.slug}/`}><img src={cloudinaryImage(band.image, 640)} alt={band.name} width="640" height="400" loading="lazy" decoding="async" className="mb-5 aspect-[8/5] w-full rounded-2xl object-cover object-top" /></Link>}
        <h3 className="text-2xl font-semibold"><Link to={`/act/${band.slug}/`}>{band.name}</Link></h3>
        <p className="mt-2 font-medium text-gray-600">{band.style} · {band.lineup}</p>
        <p className="mt-4 leading-7 text-gray-700">{band.detail}</p>
        <Link className="mt-5 inline-block font-semibold underline underline-offset-4" to={`/act/${band.slug}/`}>Watch performances & explore songs</Link>
      </article>)}</div>
      {page.related && <aside className="mt-6 rounded-3xl bg-gray-50 p-6"><h3 className="text-xl font-semibold">An R&B alternative</h3><p className="mt-3 leading-7 text-gray-700">{page.related.text}</p><Link className="mt-4 inline-block font-semibold underline" to={`/act/${page.related.slug}/`}>Explore {page.related.name}</Link></aside>}
    </section>
    <section className="mt-12"><h2 className="text-3xl font-semibold">Plan your live wedding music</h2><ul className="mt-5 list-disc space-y-3 pl-6 leading-7 text-gray-700">{page.planning.map(tip => <li key={tip}>{tip}</li>)}</ul><p className="mt-5"><Link className="underline" to="/venues/">Explore our venue guide</Link> for venue and room information.</p></section>
    <section className="mt-12"><h2 className="text-3xl font-semibold">Your questions answered</h2><div className="mt-6 space-y-7">{page.faqs.map(faq => <div key={faq.q}><h3 className="text-xl font-semibold">{faq.q}</h3><p className="mt-3 leading-8 text-gray-700">{faq.a}</p></div>)}</div></section>
    <section className="mt-12 rounded-3xl bg-gray-100 p-6 sm:p-9"><h2 className="text-2xl font-semibold">Find the right band for your wedding</h2><p className="mt-4 max-w-3xl leading-7">Tell us your date, venue and music ideas. We’ll help you compare the available options and confirm your lineup and quote.</p><div className="mt-6 flex flex-wrap gap-4"><Link to="/acts/" className="rounded-full bg-black px-6 py-3 font-semibold text-white">Explore bands & pricing</Link><Link to="/contact/" className="rounded-full border border-black px-6 py-3 font-semibold">Talk to our team</Link></div></section>
    <nav aria-label="More wedding band guides" className="mt-12"><h2 className="text-2xl font-semibold">Explore more wedding music</h2><div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">{genrePages.filter(item => item.slug !== slug).map(item => <Link key={item.slug} className="underline" to={`/${item.slug}/`}>{item.name}</Link>)}{locationPages.filter(item => ['surrey', 'essex', 'buckinghamshire'].includes(item.slug)).map(item => <Link key={item.slug} className="underline" to={`/wedding-bands-${item.slug}/`}>Wedding bands in {item.name}</Link>)}</div></nav>
  </main>;
}

export function GenreBandLinks({ slug }) {
  const pages = genrePages.filter(page => page.bands.some(band => band.slug === slug) || page.related?.slug === slug);
  if (!pages.length) return null;
  return <nav aria-label="Related music guides" className="mx-auto my-8 max-w-6xl rounded-2xl bg-gray-50 p-6"><h2 className="text-xl font-semibold">Explore the music</h2><div className="mt-3 flex flex-wrap gap-4">{pages.map(page => <Link key={page.slug} className="underline" to={`/${page.slug}/`}>{page.name}</Link>)}</div></nav>;
}

export default function GenreWeddingBands({ slug }) {
  const page = genrePages.find(item => item.slug === slug);
  const route = `/${slug}/`;
  return <><SEO {...genreMeta(page)} path={route} /><Helmet><script type="application/ld+json">{serializeSchema(buildPageSchema({ route, ...genreMeta(page), genre: page }))}</script></Helmet><GenreWeddingBandsContent slug={slug} /></>;
}

GenreWeddingBandsContent.propTypes = { slug: PropTypes.oneOf(genrePages.map(page => page.slug)).isRequired };
GenreBandLinks.propTypes = { slug: PropTypes.string };
GenreWeddingBands.propTypes = GenreWeddingBandsContent.propTypes;
