import { useEffect } from 'react';
import { BRAND } from '../../config/brand';

export default function SeoHead({
  title,
  description = 'Bespoke return gifts for distinguished corporate galas and couture weddings. Designed through a guided sensory concierge.'
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
    document.title = fullTitle;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `${BRAND.name}: ${description}`);
    }
  }, [title, description]);

  return null;
}
