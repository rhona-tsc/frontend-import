const paragraph = (text, links) => ({ type: 'paragraph', text, ...(links ? { links } : {}) });
const heading = text => ({ type: 'heading', text });
const link = (text, href) => ({ text, href });

export const soundLimitersGuide = {
  slug: 'sound-limiters-at-wedding-venues-what-you-need-to-know',
  title: 'Sound Limiters at Wedding Venues: What You Need to Know',
  metaTitle: 'Wedding Venue Sound Limiters: Questions to Ask | The Supreme Collective',
  metaDescription: 'Choosing a wedding venue with a sound limiter? Understand the setup, questions to ask and possible band adaptations before confirming your live music.',
  excerpt: 'Ask about sound restrictions before booking your venue: a practical guide to limiters, band setups and planning a great evening of live music.',
  category: 'Wedding Planning', author: 'Rhona Downie', authorType: 'Person',
  publishedAt: '2025-04-04', readTime: '5 min read',
  content: [
    paragraph('Planning a wedding comes with a long list of decisions. If live music is important to you, ask your venue one question early: “Do you have a sound limiter?” Knowing the answer before you book gives your musicians time to assess the room, discuss any restrictions and recommend a suitable setup.'),
    paragraph('Originally published on 4 April 2025; restored and updated on 23 October 2026. We have refreshed the technical guidance: a decibel number alone cannot tell you whether a particular band will work in a room, and equipment changes are not a guarantee of compliance.'),
    heading('What is a sound limiter?'),
    paragraph('A venue sound limiter monitors or controls sound against a configured limit. Some systems reduce the audio signal; others can interrupt the power supplied to the music equipment when their trigger conditions are met. Ask which system is installed and what it controls. These are different arrangements, so “we have a limiter” is only the start of the conversation.'),
    paragraph('For examples of those different approaches, manufacturer Formula Sound describes both cut-off limiters and automatic volume-control systems.', [link('Formula Sound', 'https://formula-sound.co.uk/system-protection-noise-control/')]),
    heading('Why do venues use them?'),
    paragraph('Ask the venue team to explain its noise requirements and how they apply to your wedding. Get the rules for the specific room, performance area and finish time in writing, and pass them to your band before you confirm the entertainment. Do not assume that arrangements at a different wedding or another room in the same building will apply to yours.'),
    heading('Why the decibel limit is not the whole answer'),
    paragraph('Ask for the limiter make and model, its threshold, the measurement weighting and the microphone position. Systems can use different weighting settings and internal or external microphones. Your band or sound engineer needs that context, not just a number such as “95 dB”, to assess the proposed setup.'),
    paragraph('The position of the musicians, speakers and monitoring equipment should be discussed with the venue team. Ask how long the level can exceed the threshold before the system responds, whether settings change during the evening, and who deals with a trip or reset. Do not move, cover or bypass monitoring equipment.'),
    heading('What can a band do about it?'),
    paragraph('Depending on the musicians, repertoire and venue requirements, options to discuss include an electronic drum kit, a quieter acoustic-drum approach, fewer onstage amplifiers, direct connections to a suitable PA, and in-ear monitoring instead of stage wedges. These are possibilities to agree with the chosen act, not equipment every band automatically supplies.'),
    paragraph('In-ear monitors can reduce the need for monitor speakers, but they do not make acoustic drums, brass, vocals or the audience silent. Likewise, connecting instruments directly to a PA does not remove the need to control the sound coming out of that PA. Ask the band what adaptations are realistic without losing the style of performance you want.'),
    heading('Questions to ask before booking'),
    paragraph('Does the venue have a limiter, and what type is it? What is the threshold and measurement setup? Must the band use the venue’s PA or approved technician? What equipment and stage positions are permitted? Are there restrictions on drums or brass? When must live music and recorded music finish? Can the band soundcheck before guests enter, and who is responsible for operating the system?'),
    heading('Choose the venue and band together'),
    paragraph('Think about the celebration you want: a relaxed acoustic set, a compact party band or a larger lineup with brass. Share that vision and the venue’s technical requirements with us early. “We have had bands before” is useful background, but it is not confirmation that every lineup will suit the same conditions.'),
    paragraph('Browse our venue guide, explore wedding bands, or get in touch with your venue details so we can discuss the right musical setup. Lighting has its own planning questions too; our wedding band lighting guide explains what to check.', [link('venue guide', '/venues/'), link('wedding bands', '/acts/'), link('get in touch', '/contact/'), link('wedding band lighting guide', '/blog/essential-stage-lighting-for-your-wedding-band/')]),
  ],
};

const hotel = (name, text, website) => [heading(name), paragraph(text), paragraph('Check current venue information and arrangements directly with the hotel.', [link('current venue information', website)])];
export const londonHotelsGuide = {
  slug: 'londons-swankiest-hotels-for-your-wedding',
  title: 'London’s Swankiest Hotels for Your Wedding',
  metaTitle: 'Luxury London Wedding Hotels & Live Music Planning | The Supreme Collective',
  metaDescription: 'Revisit our London wedding hotel shortlist, with updated hotel names, official venue links and practical questions for planning your live band.',
  excerpt: 'Our original London hotel shortlist, revisited with current names and the live-music questions to ask before booking your wedding venue.',
  category: 'Wedding Venues', author: 'Rhona Downie', authorType: 'Person',
  publishedAt: '2017-06-11', readTime: '6 min read',
  content: [
    paragraph('A hotel wedding can bring the ceremony, wedding breakfast, evening party and somewhere to stay together in one place. From a band’s perspective, the most useful conversations are practical ones: where we will perform, how equipment gets into the room, when soundcheck can happen and how the evening moves from dinner to dancing.'),
    paragraph('This shortlist first appeared in June 2017, drawing on hotels and venues we had performed at. Restored on 23 October 2026, it keeps those original choices while noting two changed hotel names and linking to current venue information. Our past performance history does not imply a current partnership or preferred-supplier status. Capacities, packages, staffing, access and music policies must be checked directly; the old article’s figures and complimentary-package promises have not been carried forward.'),
    ...hotel('The Dilly, Piccadilly — formerly Le Méridien Piccadilly', 'Our original entry focused on the Oak Room, with its oak panelling and chandeliers. The property is now known as The Dilly. If you are considering a wedding here, ask which rooms are available for your date and how the chosen room will accommodate both the band and dance floor.', 'https://www.thedillylondon.com/events/weddings'),
    paragraph('The former owner’s account confirms the change from Le Méridien to The Dilly.', [link('former owner’s account', 'https://www.archerhotelcapital.com/archer-completes-sale-of-the-dilly-hotel/')]),
    ...hotel('The Savoy', 'The Lancaster Ballroom was a highlight of our original list, particularly for dancing and its stage. The Savoy still describes a stage in its current ballroom information. Ask the events team about the performance position, the equipment route into the room and the layout once dinner service gives way to the evening party.', 'https://www.thesavoylondon.com/events-and-celebrations/lancaster-ballroom'),
    ...hotel('The Dorchester', 'The original article chose The Dorchester for its luxurious wedding setting. For your own celebration, establish the room and guest layout first, then discuss the band’s footprint, preparation space, setup schedule and any technical requirements with the hotel and musicians together.', 'https://www.dorchestercollection.com/london/the-dorchester'),
    ...hotel('London Marriott Hotel Marble Arch', 'Our original entry highlighted this Marble Arch hotel as a base for a London celebration close to Hyde Park and the West End. Ask for the current wedding-room options and confirm how much space remains for musicians, speakers and dancing after tables are in place.', 'https://www.marriott.com/en-us/hotels/lonma-london-marriott-hotel-marble-arch/events/'),
    ...hotel('Sheraton Grand London Park Lane', 'The Art Deco ballroom, separate entrance and built-in stage made this a memorable choice in the original shortlist. Those are useful starting points for the music plan, but agree the current access arrangements, technical provision and room layout rather than assuming every wedding uses the same setup.', 'https://www.marriott.com/en-gb/hotels/event-planning/wedding-planning/longr-sheraton-grand-london-park-lane/'),
    ...hotel('The Ritz London', 'Our original feature centred on William Kent House and its elegant private rooms. If your day uses more than one space, discuss where the music belongs at each stage, whether equipment needs to move, and whether an intimate musical setup or an evening party lineup best suits the booked room.', 'https://www.theritzlondon.com/'),
    ...hotel('The Waldorf Hilton, London', 'Palm Court and the Adelphi Suite featured in the original article and remain named spaces on the hotel’s current events page. Ask how your chosen rooms will be used through the day, whether there is a room change or turnaround, and when the band can set up without interrupting the celebration.', 'https://www.hilton.com/en/hotels/lonwahi-the-waldorf-hilton-london/events/'),
    ...hotel('The Landmark London', 'Our original shortlist highlighted the hotel’s wedding planning and different banqueting spaces. For live music, start with the specific room and seating plan: a ballroom and a smaller reception space can call for quite different band and PA arrangements.', 'https://www.landmarklondon.co.uk/meetings-events/'),
    ...hotel('Grand Sapphire, Croydon', 'Grand Sapphire brought a larger celebration option to the original list. Its current website identifies it as a wedding, event and hotel venue in Croydon. Discuss the booked suite, performance area and sound coverage with the team rather than choosing a band setup from the guest count alone.', 'https://grandsapphire.co.uk/'),
    ...hotel('Portman Square — formerly Radisson Blu, now Nobu Hotel London Portman Square', 'The original article listed Radisson Blu Portman Square. That property was subsequently redeveloped as Nobu Hotel London Portman Square; the project architect documents the transformation. Treat it as a changed venue rather than relying on the old room descriptions or capacity figures, and ask the current events team about your wedding plans.', 'https://www.nobuhotels.com/london-portman/explore/faq/'),
    paragraph('The project architect’s account explains the former Radisson Blu’s renovation into Nobu.', [link('project architect’s account', 'https://bsbgroup.com/blog/nobu-hotel-london-portman-square-wins-prestigious-hotel-design-award')]),
    heading('Planning the music for your London hotel wedding'),
    paragraph('Before confirming your entertainment, agree the available stage space, loading access, setup and soundcheck times, sound restrictions, power provision, changing space and supplier meals. These should be confirmed for your booking; they are not automatic inclusions simply because a venue is a hotel.'),
    paragraph('Explore wedding bands in London, browse our venue guide, and read our sound-limiters guide before finalising the music. Send us your date and venue to discuss a lineup that fits your celebration.', [link('wedding bands in London', '/wedding-bands-london/'), link('venue guide', '/venues/?county=London'), link('sound-limiters guide', '/blog/sound-limiters-at-wedding-venues-what-you-need-to-know/'), link('date and venue', '/acts/')]),
  ],
};

export const phoebeArchive = {
  slug: 'get-to-know-phoebe', title: 'Get to Know Phoebe',
  metaTitle: 'Get to Know Phoebe: A Singer’s Wedding Diary | The Supreme Collective',
  metaDescription: 'Meet singer Phoebe through our 2017 archive interview and her account of performing with Claire at Joe and Kirsten’s wedding at Eastington Park.',
  excerpt: 'A look back at Phoebe’s favourite music and her 2017 diary of performing at Joe and Kirsten’s wedding at Eastington Park.',
  category: 'Behind the Music', author: 'Rhona Downie', authorType: 'Person',
  publishedAt: '2017-05-25', readTime: '4 min read',
  content: [
    paragraph('From our 2017 archive, restored on 23 October 2026. This interview and wedding diary describe Phoebe’s work and preferences at the time; they are not a statement of her current representation, location or availability. The diary below is Phoebe’s account, lightly edited for spelling and readability.'),
    paragraph('Our original introduction described Phoebe as an accomplished singer-songwriter with classic pop tones and an infectious love of performing. It recorded her work in the UK and Los Angeles, writing and recording with artists including Pharrell Williams, and her experience as an X Factor finalist mentored by Simon Cowell. Those biographical details are retained here as part of the original 2017 account, rather than a newly checked current biography.'),
    heading('Phoebe’s favourites — as shared in 2017'),
    paragraph('Food: fish and chips. Colour: baby blue. Song at the time: “Only Love Can Hurt Like This” by Paloma Faith. Artists: Aretha Franklin and Beyoncé. Sports: running and badminton. Drinks: apple juice and red wine. In her downtime, Phoebe enjoyed shopping in central London and exploring the museums.'),
    heading('Performances from the original article'),
    paragraph('The original page linked to Phoebe Brown singing “(You Make Me Feel Like) A Natural Woman” at Ronnie Scott’s and an acoustic performance of “FourFiveSeconds”. Watch them on YouTube; these are external archive links and availability may change.', [link('“(You Make Me Feel Like) A Natural Woman” at Ronnie Scott’s', 'https://www.youtube.com/watch?v=tlrtEawdygU'), link('an acoustic performance of “FourFiveSeconds”', 'https://www.youtube.com/watch?v=2CvTLuPDdQw')]),
    heading('Diary entry, 25 May 2017: Joe and Kirsten’s wedding'),
    paragraph('Last weekend we performed and partied away on stage with the fabulous Joe and Kirsten.'),
    paragraph('Joe and Kirsten chose me and Claire to sing at their wedding, which worked out perfectly as we lived fairly close to each other. We set off from London to Eastington Park, a beautiful manor house near Bristol and Bath.'),
    paragraph('It took us about two hours to drive there and, of course, we stopped for coffee on the way! We usually got to gigs about four or five hours before we were meant to go on stage because we liked to soundcheck before the guests arrived. We also had to do our hair and makeup, to perfection of course!'),
    paragraph('The venue itself was truly beautiful and not only oozed elegance but had a really homely vibe. We were in our changing room and exploring the grounds for about three hours before we were called to soundcheck. In this time, guests were finishing up their food, which looked amazing, and cutting the cake.'),
    paragraph('We hopped onto the stage and completed our soundcheck, and then all the guests came in. They immediately joined in the fun and started dancing with us. We usually opened with the crowd-pleasing “Respect” by Aretha Franklin, which always got everyone going! For this gig, the songs chosen by Joe and Kirsten were absolutely excellent. They chose a mix of pop and Motown, which I especially love. One of my favourites that we performed was “Uptown Funk”.'),
    paragraph('Claire and I partied on stage and even went into the audience with the guests. Claire is excellent at getting the party going, and we really do have fun on stage together. I always love to sing with Claire; we have a really good connection and chemistry on stage.'),
    paragraph('After our party band performance came to an end, we naturally did an encore, and still the guests were hoping for more. We had to call it a night at midnight under the venue arrangements for that wedding. The band packed up and we headed home at about 1am.'),
    paragraph('Overall, the gig was awesome, and I wish Joe and Kirsten all the happiness in the world! Phoebe x'),
    paragraph('The timings and venue arrangements above relate to that 2017 wedding, not Eastington Park’s current policy or a standard arrival time for every band. Confirm the schedule for your own booking separately.'),
    heading('Planning your own live music?'),
    paragraph('Explore our current bands, browse the venue guide or get in touch about your celebration. Individual musician availability must be confirmed for your date.', [link('current bands', '/acts/'), link('venue guide', '/venues/'), link('get in touch', '/contact/')]),
  ],
};

export const recoveredArchivePosts = [soundLimitersGuide, londonHotelsGuide, phoebeArchive];
