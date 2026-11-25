
from decimal import Decimal, ROUND_HALF_UP

from fastapi import FastAPI, Query
from pydantic import BaseModel, Field

app = FastAPI(
    title="FinCore Analytics API",
    description="Financial calculations and risk analytics service",
    version="1.0.0"
)


# -------------------------
# Financial Calculation Logic
# -------------------------

def calculate_fee(amount: Decimal, rate: Decimal) -> Decimal:
    fee = amount * rate / Decimal("100")
    return fee.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )


def calculate_interest(
    principal: Decimal,
    annual_rate: Decimal,
    days: int
) -> Decimal:
    interest = (
        principal * annual_rate * Decimal(days)
        / Decimal("36500")
    )

    return interest.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )


# -------------------------
# Request Models
# -------------------------

class CalculationRequest(BaseModel):
    amount: Decimal = Field(gt=0)
    rate: Decimal = Field(ge=0, le=100)


# -------------------------
# Health Check
# -------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "fincore-analytics"
    }


@app.get("/risk/health")
def risk_health():
    return {
        "status": "ready",
        "message": "Risk analytics service is running"
    }


# -------------------------
# Fee Calculation
# -------------------------

@app.post("/calculations/fee")
def fee_calculation(data: CalculationRequest):
    fee = calculate_fee(data.amount, data.rate)

    return {
        "amount": str(data.amount),
        "rate": str(data.rate),
        "fee": str(fee),
        "total": str(data.amount + fee)
    }


# -------------------------
# Interest Calculation
# -------------------------

@app.post("/calculations/interest")
def interest_calculation(
    principal: Decimal = Query(gt=0),
    annual_rate: Decimal = Query(ge=0),
    days: int = Query(ge=0)
):
    interest = calculate_interest(
        principal,
        annual_rate,
        days
    )

    return {
        "principal": str(principal),
        "annual_rate": str(annual_rate),
        "days": days,
        "interest": str(interest),
        "total": str(principal + interest)
    }
# -------------------------
# Transaction Risk Analytics
# -------------------------

class RiskRequest(BaseModel):
    amount: Decimal = Field(gt=0)
    transactions_last_hour: int = Field(ge=0)
    failed_attempts: int = Field(ge=0)


@app.post("/risk/analyze")
def analyze_risk(data: RiskRequest):
    score = 0
    reasons = []

    if data.amount >= Decimal("50000"):
        score += 40
        reasons.append("High transaction amount")

    if data.transactions_last_hour >= 5:
        score += 30
        reasons.append("High transaction frequency")

    if data.failed_attempts >= 3:
        score += 30
        reasons.append("Multiple failed attempts")

    level = (
        "HIGH" if score >= 60
        else "MEDIUM" if score >= 30
        else "LOW"
    )

    return {
        "risk_score": score,
        "risk_level": level,
        "reasons": reasons,
        "decision": "REVIEW" if score >= 60 else "ALLOW"
    }