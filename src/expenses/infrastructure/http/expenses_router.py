from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from src.expenses.infrastructure.http.expenses_schemas import RegisterExpenseRequest, ExpenseResponse
from src.expenses.application.register_expense import RegisterExpense
from src.expenses.application.list_trip_expenses import ListTripExpenses
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(prefix="/trips/{trip_id}/expenses", tags=["expenses"])

@router.post("/", response_model=ExpenseResponse)
async def register_expense(trip_id: str, request: RegisterExpenseRequest, user_id: str = Depends(get_current_user_id)):
    try:
        register_expense_uc = RegisterExpense()
        splits_data = None
        if request.splits:
            splits_data = [{"user_id": split.user_id, "amount": split.amount} for split in request.splits]
        
        expense = await register_expense_uc.execute(
            trip_id=trip_id,
            user_id=user_id,
            amount=request.amount,
            description=request.description,
            expense_date=request.date,
            currency=request.currency,
            category=request.category,
            activity_id=request.activity_id,
            splits=splits_data
        )
        return ExpenseResponse(**expense.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[ExpenseResponse])
async def list_trip_expenses(trip_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        list_expenses = ListTripExpenses()
        expenses = await list_expenses.execute(trip_id, user_id)
        return [ExpenseResponse(**expense.dict()) for expense in expenses]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))