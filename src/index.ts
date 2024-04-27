import express, { Request, Response } from "express";

const app = express();
const PORT = 3000;

const transactionsRoute = require("./transactions/route");
const tokenRoute = require("./tokens/route");
const defiRoute = require("./defi/route");

// Middleware
app.use(express.json());

// Routes
app.use("/api/v1/transactions", transactionsRoute);
app.use("/api/v1/tokens", tokenRoute);
app.use("/api/v1/defi", defiRoute);

// Default route
app.get("/", (req: Request, res: Response) => {
  // Use req and res directly
  res.send("Hello Sacha! Sup!");
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  // Use err, req, res, and next directly
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Starting the server
async function main() {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
