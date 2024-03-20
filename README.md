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
   cd evm_digester
   npm install
   
3 **Set up the PostgreSQL database:**
   - Install PostgreSQL and create a new database.
   - Update the database connection details directly in the database.ts file.
   - 
4 **Start the server:**
   - npm start (or) npm run start

## USAGE
Once the server is running, you can access the API endpoints to fetch blockchain data.

## API Endpoints
1 **Blocks**
  - GET /api/v1/blocks: Get all blocks
  - GET /api/v1/blocks/:block: Get a block by ID
  - GET /api/v1/blocks/:from/:to: Get blocks within a range
    
2 **Transactions**
  - GET /api/v1/transactions: Get all transactions
  - GET /api/v1/transactions/:txn: Get a transaction by hash

3 **Logs**
  - GET /api/v1/logs: Get all logs
  - GET /api/v1/logs/:address: Get logs by address
  - GET /api/v1/logs/:address/:fromBlock/:toBlock: Get logs within a block range

  

