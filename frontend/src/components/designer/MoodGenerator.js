/**
 * Rule-based aesthetic mood generator for Shvom Gift Concepts.
 * Synthesizes materials, tone, sensory mediums, and occasion into an editorial narrative.
 */

export function generateConceptNarrative(answers = {}) {
  const occasion = answers.occasion || 'celebration';
  const category = answers.gift_category || 'bespoke_curation';
  const packaging = answers.packaging_style || 'linen_keepsake_box';
  const personalization = answers.personalization_level || 'custom_card';

  // Category descriptor
  const categorySnippets = {
    edible: "delicious gourmet dry fruits, fine chocolates, and premium sweets",
    fragrance: "natural botanical soy candles and soothing home fragrances",
    home_decor: "handcrafted brass decorative bowls and carved white Makrana marble trays",
    desk_lifestyle: "premium full-grain leather writing folios and solid brass pens",
    jewellery_silver: "hallmarked 925 sterling silver coins and keepsake silver gift boxes",
    sustainable_plants: "live miniature bonsai plants and tabletop greens in glass planters",
    bespoke_curation: "a custom curated gift box pairing fragrant candles, brass keepsakes, and gourmet treats"
  };

  // Packaging descriptor
  const packagingSnippets = {
    linen_keepsake_box: "presented in a fine linen keepsake box with magnetic closure and satin ribbon",
    solid_wood_chest: "presented in a solid hand-crafted wooden box with engraved lid and brass hinges",
    rigid_matte_box: "presented in a premium modern rigid box with custom velvet insert tray",
    leather_trunk: "presented in a classic keepsake trunk box with antique brass clasp",
    eco_paper: "wrapped in handmade 100% recycled cotton paper and stamped with botanical wax"
  };

  // Personalization descriptor
  const personalizationSnippets = {
    gold_foil_embossing: "finished with elegant gold foil stamping of your logo or initials",
    monogram_engraving: "custom engraved with your names, date, or logo",
    individual_guest_calligraphy: "personalized with each guest's name handwritten on cards",
    bespoke_scent_wax_seal: "sealed with a classic wax stamp featuring your custom initials",
    custom_card: "accompanied by an elegant printed thank-you card with your personal message"
  };

  // Occasion tone
  let occasionNote = "Designed to leave a lasting, heartfelt impression.";
  if (occasion === 'whats_on_your_mind') {
    const org = answers.company_name ? ` for ${answers.company_name}` : '';
    const snippet = answers.thoughts
      ? (answers.thoughts.length > 80 ? answers.thoughts.slice(0, 80) + '...' : answers.thoughts)
      : 'your bespoke thoughts and custom ideas';
    occasionNote = `Conceived${org} around your thoughts: "${snippet}". Curated with tailored elegance and personal distinction.`;
  } else if (occasion === 'corporate') {
    const org = answers.company_name || 'your organization';
    occasionNote = `Conceived for ${org} as a thoughtful and premium return gift for your guests.`;
  } else if (occasion === 'wedding') {
    const couple = answers.couple_names || 'the newlyweds';
    occasionNote = `Curated in celebration of ${couple}, as a heartfelt thank-you your guests will cherish.`;
  }

  const moodText = occasion === 'whats_on_your_mind'
    ? occasionNote
    : `${categorySnippets[category] || categorySnippets.bespoke_curation}, ${packagingSnippets[packaging] || packagingSnippets.linen_keepsake_box}, and ${personalizationSnippets[personalization] || personalizationSnippets.custom_card}. ${occasionNote}`;

  return {
    moodText,
    paletteSuggestion: occasion === 'wedding' ? 'Ivory, Warm Muted Gold & Makrana Stone' : 'Charcoal, Architectural Bone & Brushed Brass',
    curationCode: `SHV-${(category || 'CUR').toUpperCase().slice(0, 3)}-${(packaging || 'BOX').toUpperCase().slice(0, 3)}`
  };
}
