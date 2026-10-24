
import json

from qwen_service import client, QWEN_MODEL

ALLOWED_LAYERS = {
    "education",
    "healthcare",
    "pharmacies",
    "food_services",
    "green_spaces",
    "buildings",
    "landuse",
    "roads",
    "shops",
    "transport",
    "waterways",
}

LAYER_MAP = {
    "school": "education",
    "schools": "education",
    "college": "education",
    "colleges": "education",
    "hospital": "healthcare",
    "hospitals": "healthcare",
    "clinic": "healthcare",
    "clinics": "healthcare",
    "pharmacy": "pharmacies",
    "pharmacies": "pharmacies",
    "restaurant": "food_services",
    "restaurants": "food_services",
    "park": "green_spaces",
    "parks": "green_spaces",
    "road": "roads",
    "roads": "roads",
    "shop": "shops",
    "shops": "shops",
    "building": "buildings",
    "buildings": "buildings",
    "waterway": "waterways",
    "waterways": "waterways",
    "transport": "transport",
    "landuse": "landuse",
}


def plan_query(user_query: str) -> dict:
    """Create a validated GIS query plan using Qwen3."""

    schema = {
        "type": "object",
        "properties": {
            "operation": {
                "type": "string",
                "enum": ["list_features", "within_distance", "unsupported"],
            },
            "target_layer": {
                "type": "string",
                "enum": sorted(ALLOWED_LAYERS),
            },
            "reference_layer": {
                "type": ["string", "null"],
                "enum": sorted(ALLOWED_LAYERS) + [None],
            },
            "distance_m": {
                "type": ["number", "null"],
            },
            "explanation": {
                "type": "string",
            },
        },
        "required": [
            "operation",
            "target_layer",
            "reference_layer",
            "distance_m",
            "explanation",
        ],
    }

    prompt = f"""
Plan a GIS query for Thodupuzha.

Available layer meanings:
- education: schools and colleges
- healthcare: hospitals and clinics
- pharmacies: pharmacies
- food_services: restaurants and food outlets
- green_spaces: parks and green spaces
- buildings: buildings
- landuse: land-use areas
- roads: roads
- shops: shops
- transport: transport locations
- waterways: waterways

Return only the requested JSON object.

Rules:
1. For a simple list request, use list_features.
2. For a distance request, use within_distance.
3. In a proximity request, target_layer is what the user wants to find.
4. reference_layer is what the target must be near.
5. Convert kilometres to metres.
6. Do not change the requested distance.
7. For list_features, reference_layer and distance_m must be null.
8. If the request cannot be represented, use unsupported.
9. Do not execute GIS operations or invent results.

Examples:
Question: Show all schools
Plan: operation=list_features, target_layer=education,
      reference_layer=null, distance_m=null

Question: Find schools within 500 metres of hospitals
Plan: operation=within_distance, target_layer=education,
      reference_layer=healthcare, distance_m=500

Question: Find shops within 2 km of roads
Plan: operation=within_distance, target_layer=shops,
      reference_layer=roads, distance_m=2000

User question: {user_query}
"""

    response = client.chat(
        model=QWEN_MODEL,
        messages=[
            {
                "role": "system",
                "content": "Convert GIS questions into the requested structured plan.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        format=schema,
        think=False,
        stream=False,
        options={
            "temperature": 0,
            "num_predict": 180,
        },
    )

    raw = (response.message.content or "").strip()

    if not raw:
        raise ValueError("Qwen3 returned an empty query plan.")

    plan = json.loads(raw)

    operation = plan["operation"]
    target = plan["target_layer"]
    reference = plan["reference_layer"]
    distance = plan["distance_m"]

    if target not in ALLOWED_LAYERS:
        raise ValueError("Invalid target layer.")

    if reference is not None and reference not in ALLOWED_LAYERS:
        raise ValueError("Invalid reference layer.")

    if operation == "list_features":
        if reference is not None or distance is not None:
            raise ValueError("List queries must not include distance parameters.")

    elif operation == "within_distance":
        if reference is None or reference == target:
            raise ValueError("A distinct reference layer is required.")

        if (
            not isinstance(distance, (int, float))
            or isinstance(distance, bool)
            or not 0 < distance <= 100000
        ):
            raise ValueError("Distance must be between 0 and 100000 metres.")

    return {
        "operation": operation,
        "target_layer": target,
        "reference_layer": reference,
        "distance_m": distance,
        "explanation": str(plan["explanation"])[:300],
    }
