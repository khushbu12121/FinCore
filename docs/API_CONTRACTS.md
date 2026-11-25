@'
# FinCore API Contracts

## Overview
Base URL: `http://localhost:5000`

API uses JSON request and response bodies. Monetary amounts are represented in major currency units (e.g. INR), validated to a maximum of two decimal places.

## Health

### GET `/health`
Checks API and database connectivity.

**200**
```json
{
  "status": "healthy",
  "database": "connected",
  "service": "FinCore API"
}