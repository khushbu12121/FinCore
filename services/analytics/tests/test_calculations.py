from decimal import Decimal
from main import calculate_fee, calculate_interest


def test_fee_calculation():
    assert calculate_fee(Decimal("1000"), Decimal("2")) == Decimal("20.00")


def test_interest_calculation():
    result = calculate_interest(
        Decimal("10000"),
        Decimal("10"),
        365
    )
    assert result == Decimal("1000.00")


def test_zero_interest():
    assert calculate_interest(
        Decimal("1000"),
        Decimal("0"),
        365
    ) == Decimal("0.00")
from main import RiskRequest, analyze_risk


def test_high_risk_transaction():
    result = analyze_risk(RiskRequest(
        amount=60000,
        transactions_last_hour=6,
        failed_attempts=3
    ))
    assert result["risk_score"] == 100
    assert result["risk_level"] == "HIGH"
    assert result["decision"] == "REVIEW"


def test_medium_risk_transaction():
    result = analyze_risk(RiskRequest(
        amount=1000,
        transactions_last_hour=5,
        failed_attempts=0
    ))
    assert result["risk_score"] == 30
    assert result["risk_level"] == "MEDIUM"
    assert result["decision"] == "ALLOW"

def test_low_risk_transaction():
    result = analyze_risk(RiskRequest(
        amount=1000,
        transactions_last_hour=1,
        failed_attempts=0
    ))
    assert result["risk_score"] == 0
    assert result["risk_level"] == "LOW"
    assert result["decision"] == "ALLOW"