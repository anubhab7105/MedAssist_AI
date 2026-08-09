from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.rate_limit import limiter, DEFAULT_RATE
from app.core.security import get_current_user, AuthenticatedUser
from app.models.schemas import NearbyPlacesRequest, NearbyPlacesResponse
from app.services.overpass_service import find_nearby_places

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


@router.post("/nearby", response_model=NearbyPlacesResponse)
@limiter.limit(DEFAULT_RATE)
async def nearby(
    request: Request,
    payload: NearbyPlacesRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    try:
        places = await find_nearby_places(
            payload.latitude,
            payload.longitude,
            payload.radius_meters,
            payload.place_type,
            payload.search,
        )
    except Exception as exc:  # Overpass occasionally times out / rate-limits
        raise HTTPException(
            status_code=502, detail="Could not reach the map data provider. Please try again shortly."
        ) from exc

    return NearbyPlacesResponse(places=places[:40])
