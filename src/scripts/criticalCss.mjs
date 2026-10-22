import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

// Build-time extraction from the same compiled CSS and rendered HTML that ship.
// Include the entire static page shell (not just a guessed screen height) so
// scrolling or opening navigation before the rest of the CSS arrives stays safe.
export function extractInitialCss(css, html) {
  const classes = new Set([...html.matchAll(/\bclass="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)));
  const root = postcss.parse(css);
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    const selectors = selectorParser().astSync(rule.selector);
    const matching = selectors.nodes.filter(selector => {
      let needed = true;
      let functional = false;
      selector.walkPseudos(node => { if (node.nodes?.length) functional = true; });
      selector.walkClasses(node => { if (!classes.has(node.value)) needed = false; });
      return needed || functional;
    });
    if (matching.length) rule.selector = matching.map(selector => selector.toString()).join(',');
    else rule.remove();
  });
  root.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
  return root.toString();
}

export function inlineInitialCss(html, css, stylesheetTag, stylesheetUrl) {
  const critical = extractInitialCss(css, html);
  if (!critical || Buffer.byteLength(critical) > 24000) throw new Error('Initial CSS is empty or exceeds the 24 KB uncompressed budget');
  const styles = `<style id="initial-page-styles">${critical.replace(/<\/style/gi, '<\\/style')}</style>`;
  const deferred = `<link rel="preload" as="style" crossorigin href="${stylesheetUrl}" onload="this.onload=null;this.rel='stylesheet'"><noscript>${stylesheetTag}</noscript>`;
  return html.replace(stylesheetTag, styles + deferred);
}
