from typing import Optional
from decimal import Decimal
from bson import ObjectId
from src.trips.domain.trip import Activity
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class ManageTripActivities:
    def __init__(self):
        self.trip_repository = MongoTripRepository()

    async def create_activity(
        self,
        trip_id: str,
        day_id: str,
        user_id: str,
        title: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        estimated_cost: Optional[Decimal] = None,
        order: int = 0
    ) -> bool:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        user_role = None
        for member in trip.members:
            if member.user_id == user_id:
                user_role = member.role
                break

        if user_role not in ["owner", "editor"]:
            raise ValueError("User not authorized to manage activities")

        day_index = None
        for i, day in enumerate(trip.days):
            if day.id == day_id:
                day_index = i
                break

        if day_index is None:
            raise ValueError("Day not found in trip")

        activity = Activity(
            title=title,
            description=description,
            location=location,
            start_time=start_time,
            end_time=end_time,
            estimated_cost=estimated_cost,
            order=order
        )

        update_data = {
            f"days.{day_index}.activities": trip.days[day_index].activities + [activity.dict()]
        }

        return await self.trip_repository.update(trip_id, {"$push": update_data})

    async def update_activity(
        self,
        trip_id: str,
        day_id: str,
        activity_id: str,
        user_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        estimated_cost: Optional[Decimal] = None,
        order: Optional[int] = None
    ) -> bool:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        user_role = None
        for member in trip.members:
            if member.user_id == user_id:
                user_role = member.role
                break

        if user_role not in ["owner", "editor"]:
            raise ValueError("User not authorized to manage activities")

        day_index = None
        activity_index = None
        
        for i, day in enumerate(trip.days):
            if day.id == day_id:
                day_index = i
                for j, activity in enumerate(day.activities):
                    if activity.id == activity_id:
                        activity_index = j
                        break
                break

        if day_index is None or activity_index is None:
            raise ValueError("Day or activity not found")

        update_fields = {}
        if title is not None:
            update_fields[f"days.{day_index}.activities.{activity_index}.title"] = title
        if description is not None:
            update_fields[f"days.{day_index}.activities.{activity_index}.description"] = description
        if location is not None:
            update_fields[f"days.{day_index}.activities.{activity_index}.location"] = location
        if start_time is not None:
            update_fields[f"days.{day_index}.activities.{activity_index}.start_time"] = start_time
        if end_time is not None:
            update_fields[f"days.{day_index}.activities.{activity_index}.end_time"] = end_time
        if estimated_cost is not None:
            update_fields[f"days.{day_index}.activities.{activity_index}.estimated_cost"] = float(estimated_cost)
        if order is not None:
            update_fields[f"days.{day_index}.activities.{activity_index}.order"] = order

        if update_fields:
            return await self.trip_repository.update(trip_id, update_fields)
        
        return True

    async def delete_activity(
        self,
        trip_id: str,
        day_id: str,
        activity_id: str,
        user_id: str
    ) -> bool:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        user_role = None
        for member in trip.members:
            if member.user_id == user_id:
                user_role = member.role
                break

        if user_role not in ["owner", "editor"]:
            raise ValueError("User not authorized to manage activities")

        day_index = None
        for i, day in enumerate(trip.days):
            if day.id == day_id:
                day_index = i
                break

        if day_index is None:
            raise ValueError("Day not found in trip")

        pull_query = {
            f"days.{day_index}.activities": {"id": activity_id}
        }

        return await self.trip_repository.update(trip_id, {"$pull": pull_query})