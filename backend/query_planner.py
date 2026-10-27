
import json
import math

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
    "educational institution": "education",
    "educational institutions": "education",
    "hospital": "healthcare",
    "hospitals": "healthcare",
    "clinic": "healthcare",
    "clinics": "healthcare",
    "healthcare facility": "healthcare",
    "healthcare facilities": "healthcare",
    "pharmacy": "pharmacies",
    "pharmacies": "pharmacies",
    "restaurant": "food_services",
    "restaurants": "food_services",
    "food outlet": "food_services",
    "food outlets": "food_services",
    "park": "green_spaces",
    "parks": "green_spaces",
    "green space": "green_spaces",
    "green spaces": "green_spaces",
    "road": "roads",
    "roads": "roads",
    "shop": "shops",
    "shops": "shops",
    "building": "buildings",
    "buildings": "buildings",
    "waterway": "waterways",
    "waterways": "waterways",
    "transport": "transport",
    "transport location": "transport",
    "transport locations": "transport",
    "landuse": "landuse",
    "land use": "landuse",
}


def plan_query(user_query: str) -> dict:
    """Create and validate a GIS query plan using Qwen3."""

    if not isinstance(user_query, str) or not user_query.strip():
        return {
            "operation": "unsupported",
            "target_layer": "buildings",
            "reference_layer": None,
            "distance_m": None,
            "explanation": "Please enter a GIS query.",
        }

    schema = {
        "type": "object",
        "properties": {
            "operation": {
                "type": "string",
                "enum": [
                    "list_features",
                    "within_distance",
                    "unsupported",
                ],
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

Available layers and their meanings:
- education: schools, colleges, educational institutions
- healthcare: hospitals, clinics, healthcare facilities
- pharmacies: pharmacies
- food_services: restaurants, food outlets
- green_spaces: parks, green spaces
- buildings: buildings
- landuse: land-use areas
- roads: roads
- shops: shops
- transport: transport locations
- waterways: waterways

Return only the requested JSON object.

Rules:
1. For a simple request to display or list features, use list_features.
2. For a request involving proximity or distance between layers,
   use within_distance.
3. In a proximity request, target_layer is the feature type
   the user wants to find.
4. reference_layer is the feature type the target must be near.
5. Convert kilometres to metres. For example, 2 km = 2000 metres.
6. Preserve the requested distance accurately.
7. If a proximity request does not specify a distance, use a reasonable
   default of 500 metres and explain this assumption.
8. For list_features, reference_layer and distance_m must be null.
9. If the requested layer or operation cannot be represented by the
   available layers and operations, use unsupported.
10. Never invent layers, distances, GIS results, or feature counts.
11. Do not execute GIS operations. Only create a query plan.
12. Use only the exact layer identifiers listed above.
13. If the user asks for an unavailable layer, do not substitute an
    unrelated available layer.
14. For unsupported requests, set reference_layer and distance_m to null.

Examples:

Question: Show all schools
Plan: operation=list_features, target_layer=education,
      reference_layer=null, distance_m=null

Question: Find schools within 500 metres of hospitals
Plan: operation=within_distance, target_layer=education,
      reference_layer=healthcare, distance_m=500

Question: Which schools are less than 500 m from hospitals?
Plan: operation=within_distance, target_layer=education,
      reference_layer=healthcare, distance_m=500

Question: Find shops within 2 km of roads
Plan: operation=within_distance, target_layer=shops,
      reference_layer=roads, distance_m=2000

Question: Find pharmacies near hospitals
Plan: operation=within_distance, target_layer=pharmacies,
      reference_layer=healthcare, distance_m=500

Question: Show all airports
Plan: operation=unsupported, target_layer=buildings,
      reference_layer=null, distance_m=null

User question: {user_query}
"""

    response = client.chat(
        model=QWEN_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Convert GIS questions into validated structured "
                    "query plans. Follow the supplied schema and rules."
                ),
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

    try:
        plan = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "Qwen3 returned invalid JSON for the query plan."
        ) from exc

    if not isinstance(plan, dict):
        raise ValueError("The query plan must be a JSON object.")

    required_fields = {
        "operation",
        "target_layer",
        "reference_layer",
        "distance_m",
        "explanation",
    }

    if not required_fields.issubset(plan):
        raise ValueError("The query plan is missing required fields.")

    operation = plan["operation"]
    target = plan["target_layer"]
    reference = plan["reference_layer"]
    distance = plan["distance_m"]
    explanation = plan["explanation"]

    if operation not in {
        "list_features",
        "within_distance",
        "unsupported",
    }:
        raise ValueError("Invalid operation.")

    if target not in ALLOWED_LAYERS:
        raise ValueError("Invalid target layer.")

    if reference is not None and reference not in ALLOWED_LAYERS:
        raise ValueError("Invalid reference layer.")

    if not isinstance(explanation, str):
        raise ValueError("The explanation must be a string.")

    if operation == "list_features":
        if reference is not None or distance is not None:
            raise ValueError(
                "List queries must not include distance parameters."
            )

    elif operation == "within_distance":
        if reference is None or reference == target:
            raise ValueError(
                "A distinct reference layer is required."
            )

        if (
            not isinstance(distance, (int, float))
            or isinstance(distance, bool)
            or not math.isfinite(distance)
            or not 0 < distance <= 100000
        ):
            raise ValueError(
                "Distance must be between 0 and 100000 metres."
            )

        distance = float(distance)

    elif operation == "unsupported":
        reference = None
        distance = None

    return {
        "operation": operation,
        "target_layer": target,
        "reference_layer": reference,
        "distance_m": distance,
        "explanation": explanation[:300],
    }
