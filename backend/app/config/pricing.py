"""
Shvom Pricing Configuration
Rule-based pricing model: Base Category Price × Packaging Multiplier × Personalization Multiplier × Quantity Tier Discount.
All prices in INR (₹), suitable for luxury gifting studio.
"""

CATEGORY_BASE_RANGES = {
    "edible": {
        "name": "Edible & Confectionery",
        "description": "Artisanal dry fruits, single-origin chocolates, heritage confectionery",
        "min_base": 1800,
        "max_base": 3600
    },
    "fragrance": {
        "name": "Fragrance & Wellness",
        "description": "Hand-poured vegetable wax candles, botanic reed diffusers, room essences",
        "min_base": 2200,
        "max_base": 4200
    },
    "home_decor": {
        "name": "Home & Decor Keepsakes",
        "description": "Artisan brassware, carved marble trays, handcrafted ceramics",
        "min_base": 3200,
        "max_base": 6800
    },
    "desk_lifestyle": {
        "name": "Desk & Fine Lifestyle",
        "description": "Hand-stitched leather folios, solid brass instruments, bespoke organizers",
        "min_base": 2800,
        "max_base": 5800
    },
    "jewellery_silver": {
        "name": "Jewellery & Silverware",
        "description": "Hallmarked 92.5 sterling silver, filigree keepsakes, precious tokens",
        "min_base": 4800,
        "max_base": 9800
    },
    "sustainable_plants": {
        "name": "Botanical & Sustainable",
        "description": "Curated tabletop bonsai, brass terrariums, eco-conscious artifacts",
        "min_base": 1600,
        "max_base": 3400
    },
    "bespoke_curation": {
        "name": "Bespoke Curation / Shvom Suggests",
        "description": "Tailored multi-element ensemble curated by our creative director",
        "min_base": 2600,
        "max_base": 5500
    }
}

PACKAGING_MULTIPLIERS = {
    "eco_paper": 1.00,
    "rigid_matte_box": 1.10,
    "linen_keepsake_box": 1.20,
    "solid_wood_chest": 1.32,
    "leather_trunk": 1.45,
    "acrylic_display": 1.25,
    "standard": 1.05
}

PERSONALIZATION_MULTIPLIERS = {
    "custom_card": 1.02,
    "gold_foil_embossing": 1.06,
    "monogram_engraving": 1.10,
    "bespoke_scent_wax_seal": 1.15,
    "individual_guest_calligraphy": 1.12,
    "none": 1.00
}

QUANTITY_TIERS = [
    {"min": 1, "max": 49, "discount_factor": 1.00, "label": "Bespoke Boutique (under 50)"},
    {"min": 50, "max": 99, "discount_factor": 0.94, "label": "Small Atelier (50 - 99)"},
    {"min": 100, "max": 249, "discount_factor": 0.88, "label": "Mid Volume (100 - 249)"},
    {"min": 250, "max": 499, "discount_factor": 0.82, "label": "Grand Volume (250 - 499)"},
    {"min": 500, "max": 10000, "discount_factor": 0.76, "label": "Enterprise / Gala (500+)"}
]

DEFAULT_MINIMUM_ORDER_QTY = 25
