
# FinCore API Contracts

## Overview
Base URL: `http://localhost:5000`
Content-Type: `application/json`

## Health
### GET /health
Checks API and database connectivity.
- 200: Healthy
- 503: Database unavailable

## Wallets
### POST /api/wallets
Create a wallet for an active customer.

Request:
```json
{
  "customer_id": "uuid",
  "currency": "INR"
}
```
- 201: Wallet created
- 400: Invalid request
- 404: Active customer not found
- 500: Creation failed

### GET /api/wallets
Returns wallets and customer details.

### POST /api/wallets/:id/deposit
Test-mode deposit.

Request:
```json
{
  "amount": 1000,
  "idempotency_key": "unique-key"
}
```
- 201: Deposit successful
- 400: Invalid details or inactive wallet
- 404: Wallet not found
- 409: Duplicate deposit
- 500: Deposit failed

## Transfers
### POST /api/transfers

Request:
```json
{
  "from_wallet_id": "uuid",
  "to_wallet_id": "uuid",
  "amount": 500,
  "idempotency_key": "unique-key"
}
```
- 201: Transfer completed
- 200: Duplicate request; existing transfer returned
- 400: Invalid details, inactive wallet, currency mismatch, or insufficient balance
- 404: Wallet not found
- 409: Duplicate idempotency key
- 500: Transfer failed

Transfers lock wallets and update balances and ledger entries in a database transaction.

### GET /api/transfers
Returns transfers ordered by creation time.

## Refunds
### POST /api/refunds

Request:
```json
{
  "transfer_id": "uuid",
  "amount": 100,
  "reason": "Refund reason"
}
```
- 201: Refund completed
- 400: Invalid details, exceeds refundable amount, or insufficient recipient balance
- 404: Completed transfer not found
- 500: Refund failed

Partial refunds are supported up to the remaining refundable amount.

### GET /api/refunds
Returns refunds ordered by creation time.

## Payment Intents
### POST /api/payment-intents

Request:
```json
{
  "customer_id": "uuid",
  "wallet_id": "uuid",
  "amount": 100,
  "currency": "INR"
}
```
- 201: Payment intent created in test mode
- 400: Invalid details
- 404: Customer or wallet not found
- 500: Payment intent failed

### GET /api/payment-intents
Returns payment intents.

## Webhooks
### POST /api/payment-intents/webhook

Header:
`x-webhook-signature`

Request:
```json
{
  "event_id": "unique-event-id",
  "event_type": "payment.updated",
  "payment_intent_id": "uuid",
  "status": "SUCCEEDED"
}
```

Allowed status: `SUCCEEDED`, `FAILED`

- 200: Processed or duplicate ignored
- 400: Invalid event
- 401: Invalid or missing signature
- 404: Payment intent not found
- 409: Payment already processed
- 500: Processing failed

Webhook signatures use HMAC-SHA256 and timing-safe comparison.
Duplicate event IDs are ignored.

## Beneficiaries
### POST /api/beneficiaries

Request:
```json
{
  "customer_id": "uuid",
  "beneficiary_name": "Example",
  "account_reference": "account-reference",
  "bank_name": "Example Bank"
}
```
- 201: Beneficiary created
- 400: Required fields missing
- 404: Customer not found
- 409: Beneficiary already exists
- 500: Creation failed

### GET /api/beneficiaries/:customerId
Returns customer beneficiaries.

## Disputes
### POST /api/disputes

Request:
```json
{
  "transfer_id": "uuid",
  "customer_id": "uuid",
  "reason": "Dispute reason"
}
```
- 201: Dispute submitted
- 400: Required fields missing
- 404: Customer transfer not found
- 500: Submission failed

### GET /api/disputes
Returns disputes.

## Statements
### GET /api/statements/:walletId
Returns statement entries including journal reference, description, entry type, amount, timestamp, and running balance.

Response:
```json
{
  "walletId": "uuid",
  "totalTransactions": 0,
  "statement": []
}
```

## Authentication
### GET /api/auth/me
Requires authentication token.

### GET /api/auth/admin
Requires authentication token and ADMIN role.

## Ledger Semantics

### Deposits
- Debit platform clearing account
- Credit customer wallet account

### Transfers
- Debit sender account
- Credit receiver account

### Refunds
- Debit recipient account
- Credit original sender account

Journal entries are created with POSTED status.

## Idempotency
- Deposits use idempotency key in journal reference.
- Transfers store idempotency keys.
- Webhooks deduplicate using event IDs.

## Current Limitations
- List endpoints do not currently implement pagination.
- Statement CSV/PDF exports are not implemented.
- Error responses primarily use a message field; standardized error codes are not implemented.
- Authentication is not globally applied in server.ts; route-level authorization requires review.
- Payment intents operate in test mode; real payment processing is not implemented.
- OpenAPI/Swagger documentation is not yet implemented.
