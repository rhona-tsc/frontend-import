// Reviewed against each published act's approved biography, not broad genre tags.
export const ACT_SEO_STYLES = {
  'indigo-delight': 'R&B & Soul Band',
  'on-the-rocks': 'Rock & Indie Band',
  'the-dreamers': 'Folk & Pop Band',
  'funk-royale': 'Funk & Soul Band',
  'high-voltage': 'Rock & Pop Band',
  'fox-and-the-hounds': 'Roaming Acoustic Band',
  'eleventh-hour': 'Folk & Indie Band',
  'afrodeziacz': 'Afrobeats & R&B Band',
  'committed-to-kisstory': '90s & 00s R&B Band',
  'rnb-knights': 'R&B Band',
  'soul-allegiance': 'Soul & Motown Band',
  'the-riot-dogs': 'Rock & Punk Band',
  'the-monstars': 'Indie & Pop Rock Band',
  'the-party-machine': 'Pop & Funk Party Band',
  'disco-devotion': 'Disco & Funk Band',
  'one-love': 'Reggae & Soul Band',
  'soul-eras': 'Soul & Motown Band',
  'all-nighters': 'Indie Rock Band',
  'the-south-west-bounce': 'Pop & Soul Party Band',
  'motown-luxe': 'Motown & R&B Band',
  'dancefloor-magic': 'Soul & Motown Party Band',
  'band-salsa': 'Latin & Salsa Band',
  'gotta-be-garage': 'UK Garage Band',
  'magnolia-sky': 'Festival-Style Folk Band',
};

export const buildActMeta = (act = {}) => {
  const name = String(act.tscName || act.name || 'Live Band').trim();
  const slug = String(act.slug || act.tscSlug || '').trim().toLowerCase();
  const style = ACT_SEO_STYLES[slug] || 'Live Wedding & Event Band';
  return {
    title: `${name} | ${style} | The Supreme Collective`,
    description: `Book ${name} for your wedding, party or corporate event. Explore ${style.toLowerCase()} performances, compare lineups and get a quote for your date and venue.`,
  };
};
