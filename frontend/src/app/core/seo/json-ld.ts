/**
 * schema.org JSON-LD for SeoService.update({ jsonLd }): Person on Home, CreativeWork on case studies,
 * Service on Services (docs/IMPLEMENTATION-PLAN.md, F5); WebSite once from the app shell.
 */
const CONTEXT = 'https://schema.org';

export function personJsonLd(person: {
  name: string;
  url: string;
  sameAs?: string[];
  knowsAbout?: string[];
  jobTitle?: string;
}) {
  return {
    '@context': CONTEXT,
    '@type': 'Person',
    name: person.name,
    url: person.url,
    ...(person.jobTitle ? { jobTitle: person.jobTitle } : {}),
    ...(person.sameAs?.length ? { sameAs: person.sameAs } : {}),
    ...(person.knowsAbout?.length ? { knowsAbout: person.knowsAbout } : {}),
  };
}

export function creativeWorkJsonLd(work: {
  name: string;
  url: string;
  description?: string;
  inLanguage: string;
  author: string;
  image?: string;
  dateCreated?: string;
  keywords?: string[];
}) {
  return {
    '@context': CONTEXT,
    '@type': 'CreativeWork',
    name: work.name,
    url: work.url,
    inLanguage: work.inLanguage,
    author: { '@type': 'Person', name: work.author },
    ...(work.description ? { description: work.description } : {}),
    ...(work.image ? { image: work.image } : {}),
    ...(work.dateCreated ? { dateCreated: work.dateCreated } : {}),
    ...(work.keywords?.length ? { keywords: work.keywords.join(', ') } : {}),
  };
}

export function serviceJsonLd(service: {
  name: string;
  description?: string;
  provider: string;
  url: string;
  areaServed?: string;
}) {
  return {
    '@context': CONTEXT,
    '@type': 'Service',
    name: service.name,
    url: service.url,
    provider: { '@type': 'Person', name: service.provider },
    ...(service.description ? { description: service.description } : {}),
    ...(service.areaServed ? { areaServed: service.areaServed } : {}),
  };
}

export function websiteJsonLd(site: { name: string; url: string; inLanguage: string }) {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    inLanguage: site.inLanguage,
  };
}

export function profilePageJsonLd(page: { url: string; inLanguage: string; person: ReturnType<typeof personJsonLd> & { image?: string } }) {
  const { ['@context']: _context, ...person } = page.person;
  return {
    '@context': CONTEXT,
    '@type': 'ProfilePage',
    url: page.url,
    inLanguage: page.inLanguage,
    mainEntity: person,
  };
}
