import math
from typing import Dict, Any
from app.config.pricing import (
    CATEGORY_BASE_RANGES,
    PACKAGING_MULTIPLIERS,
    PERSONALIZATION_MULTIPLIERS,
    QUANTITY_TIERS,
)


def calculate_estimate(
    category_key: str,
    packaging_key: str = "linen_keepsake_box",
    personalization_key: str = "custom_card",
    quantity: int = 50,
    budget_per_gift: float = None
) -> Dict[str, Any]:
    """
    Calculates estimated price ranges per unit and total order.
    Formula: Base Category Range × Packaging Multiplier × Personalization Multiplier × Quantity Tier Discount.
    """
    cat = CATEGORY_BASE_RANGES.get(category_key, CATEGORY_BASE_RANGES["bespoke_curation"])
    base_min = cat["min_base"]
    base_max = cat["max_base"]

    pack_mult = PACKAGING_MULTIPLIERS.get(packaging_key, 1.10)
    pers_mult = PERSONALIZATION_MULTIPLIERS.get(personalization_key, 1.05)

    # Find quantity discount tier
    qty = max(1, quantity)
    tier = next(
        (t for t in QUANTITY_TIERS if t["min"] <= qty <= t["max"]),
        QUANTITY_TIERS[-1]
    )
    discount = tier["discount_factor"]

    # Calculate raw unit range
    unit_min = round(base_min * pack_mult * pers_mult * discount, -1)
    unit_max = round(base_max * pack_mult * pers_mult * discount, -1)

    total_min = round(unit_min * qty, -2)
    total_max = round(unit_max * qty, -2)

    return {
        "min_unit": float(unit_min),
        "max_unit": float(unit_max),
        "min_total": float(total_min),
        "max_total": float(total_max),
        "quantity": qty,
        "discount_label": tier["label"],
        "discount_factor": discount,
        "category_name": cat["name"]
    }
