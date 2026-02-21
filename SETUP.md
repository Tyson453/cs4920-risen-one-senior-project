# Local Development Setup Guide

This guide will help you set up and run the application locally for development and testing.

## Prerequisites

- Node.js (v16+) and npm
- Angular CLI
- AWS CLI (optional, only for deployment)

## Initial Setup (First Time Only)

### 1. Backend Setup

```bash
cd backend
npm run setup
```

This will:
- Install all backend dependencies
- Install DynamoDB Local binaries

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application Locally

### Start the Backend

**Option 1: Using npm script (recommended)**
```bash
cd backend
npm run start:local
```

**Option 2: Manual start**
```bash
cd backend
DYNAMODB_ENDPOINT=http://localhost:8000 npx serverless offline start
```

The backend will start on `http://localhost:3000` with:
- DynamoDB Local running on port 8000
- API endpoints available at `/dev/*`

### Import Test Data

After starting the backend, import the test data (only needed once per backend session):

```bash
cd backend
npm run import-data
```

Or manually:
```bash
curl -X POST http://localhost:3000/dev/import-data
```

### Start the Frontend

In a new terminal:
```bash
cd frontend
ng serve
```

The Angular app will be available at `http://localhost:4200`

## Test Credentials

After importing data, you can log in with these test accounts:

| Username | Password | Roles |
|----------|----------|-------|
| johndoe | Password123! | EMPLOYEE, ADMIN, LEAD, PM |
| janesmith | Password123! | EMPLOYEE, LEAD |
| bobjohnson | Password123! | EMPLOYEE |

## Common Issues

### Backend won't start
- Make sure no other process is using ports 3000, 3002, or 8000
- Kill any existing serverless processes: `pkill -f "serverless offline"`

### Login fails with "Invalid username or password"
- Make sure you imported the test data: `npm run import-data`
- Check backend logs for errors

### Data persists between restarts
- DynamoDB Local is running in-memory mode
- Data is cleared when the backend stops
- Re-import test data after each backend restart

## Development Workflow

1. Start backend: `cd backend && npm run start:local`
2. Import test data: `cd backend && npm run import-data` (in another terminal)
3. Start frontend: `cd frontend && ng serve` (in another terminal)
4. Navigate to `http://localhost:4200`
5. Login with test credentials
6. Start developing!

## Environment Files

### Backend (.env.local)
The backend uses `.env.local` for local development configuration:
- `DYNAMODB_ENDPOINT`: Points to local DynamoDB (http://localhost:8000)
- `JWT_SECRET`: Secret key for JWT token generation

**Note:** Never commit `.env.local` or any file with real credentials to git!

### Frontend
The frontend uses `src/environments/environment.ts` for local development.
- Current configuration points to `http://localhost:3000/dev`
- For production, switch to the AWS API Gateway URL

## Stopping the Application

1. Stop frontend: `Ctrl+C` in the frontend terminal
2. Stop backend: `Ctrl+C` in the backend terminal

## Next Steps

- To deploy to AWS: See [README.md](./README.md)
- To run tests: See individual frontend/backend test documentation
- For production builds: See [README.md](./README.md)

## Quick Reference

```bash
# Backend
cd backend
npm run start:local      # Start backend with local DynamoDB
npm run import-data      # Import test data
npm run setup            # First-time setup

# Frontend
cd frontend
ng serve                 # Start dev server
ng build --prod          # Production build
ng test                  # Run tests
```
