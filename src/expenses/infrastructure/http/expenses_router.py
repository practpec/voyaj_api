from datetime import date
from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import Any, Dict, List, Optional
from src.expenses.infrastructure.http.expenses_schemas import RegisterExpenseRequest, UpdateExpenseRequest, ExpenseResponse
from src.expenses.application.register_expense import RegisterExpense
from src.expenses.application.list_trip_expenses import ListTripExpenses
from src.expenses.application.get_expense_summary import GetExpenseSummary
from src.expenses.application.update_expense import UpdateExpense
from src.expenses.application.delete_expense import DeleteExpense
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

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(trip_id: str, expense_id: str, request: UpdateExpenseRequest, user_id: str = Depends(get_current_user_id)):
    try:
        update_expense_uc = UpdateExpense()
        splits_data = None
        if request.splits:
            splits_data = [{"user_id": split.user_id, "amount": split.amount} for split in request.splits]
        
        expense = await update_expense_uc.execute(
            expense_id=expense_id,
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

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(trip_id: str, expense_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        delete_expense_uc = DeleteExpense()
        await delete_expense_uc.execute(expense_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/summary")
async def get_expense_summary(
    trip_id: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    try:
        summary_uc = GetExpenseSummary()
        return await summary_uc.execute(trip_id, user_id, start_date, end_date, category)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
