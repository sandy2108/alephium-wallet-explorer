# evm_digester

Its a simple blockchain explorer built with Node.js, Express.js, and PostgreSQL. It provides RESTful API endpoints to query blockchain data such as blocks, transactions, and logs.

## Features

- Fetch blocks, blocks by ID, range,
- Retrieve transactions by hash
- Query logs by address, logs and block range
- Listen for new blocks and store them in the database

## Installation

To run Shiva locally, follow these steps:

1. **Clone the repository:**

   ```bash
   git clone git@github.com:sandy2108/evm_digester.git
   
2 **Install dependencies:**
   ```bash
   cd evm_digester
   npm install
   ```
   
3 **Set up the PostgreSQL database:**
   - Install PostgreSQL and create a new database.
   - Update the database connection details directly in the database.ts file.
     
4 **Start the server:**
   - npm start (or) npm run start

## USAGE
Once the server is running, you can access the API endpoints to fetch blockchain data.

## API Endpoints
1 **Transaction**
  - GET /api/v1/transactions/:address Get User Transaction in Codebase Format
    
2 **Defi**
  - GET /api/v1/defi/:address Get the Defi Position with accured Rewards (Need to add the transactions mock)

3 **tokens**
  - GET /api/v1/tokens/:address Get the user token balance

# alephium-wallet-explorer
