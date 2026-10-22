import { actNameGroups } from '../data/actNameAliases.js';
const key = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const slug = value => key(value).replace(/ /g,'-');
export function publicActRedirects(acts, groups = actNameGroups) {
  const owners = new Map();
  groups.forEach((names,index)=>names.forEach(name=>{ const s=slug(name);if(!owners.has(s))owners.set(s,new Set());owners.get(s).add(index); }));
  const routes = new Map();
  const canonical = new Set(acts.map(a=>a.slug));
  for (const act of acts) {
    if (!/^[a-z0-9-]+$/.test(act.slug || '')) continue;
    const matching=groups.map((names,index)=>({names,index})).filter(g=>g.names.some(n=>[act.name,act.tscName,act.slug.replace(/-/g,' ')].some(v=>key(v)===key(n))));
    const names=[act.name,act.tscName];
    if(matching.length===1) names.push(...matching[0].names.filter(n=>owners.get(slug(n))?.size===1));
    for(const alias of [...names.map(slug),String(act._id||'')].filter(Boolean)) {
      if(canonical.has(alias)&&alias!==act.slug)continue;
      for(const prefix of ['/act/','/bandsforhire/']) {
        if(prefix==='/act/'&&alias===act.slug)continue;
        const route=prefix+alias, target=`/act/${act.slug}/`;
        routes.set(route,routes.has(route)&&routes.get(route)!==target?null:target);
      }
    }
    routes.set(`/bandsforhire/${act.slug}`,`/act/${act.slug}/`);
  }
  return [...routes].filter(([,target])=>target).flatMap(([route,target])=>[`${route} ${target} 301!`,`${route}/ ${target} 301!`]).join('\n');
}
