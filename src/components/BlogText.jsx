import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function BlogText({ block }) {
  let rest = block.text || '';
  const parts = [];
  for (const link of block.links || []) {
    const index = rest.indexOf(link.text);
    if (index < 0) continue;
    parts.push(rest.slice(0,index));
    parts.push(link.href.startsWith('/') ? <Link key={parts.length} className="underline underline-offset-4" to={link.href}>{link.text}</Link> : <a key={parts.length} className="underline underline-offset-4" href={link.href} rel="noopener noreferrer">{link.text}</a>);
    rest = rest.slice(index+link.text.length);
  }
  parts.push(rest);
  return <>{parts.map((part,index)=><Fragment key={index}>{part}</Fragment>)}</>;
}
BlogText.propTypes = { block: PropTypes.object.isRequired };
