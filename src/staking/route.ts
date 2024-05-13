import { Request, Response, Router } from "express";
const controller = require("./controller");

const router: Router = Router();

// Adjusted to use query parameters for page and limit
router.get("/:address", async (req: Request, res: Response) => {
  try {
    // Extracting `address` from the route parameters
    const { address } = req.params;

    // Assuming `getTransactionsForAddress` is adjusted to take these parameters directly
    const transactions = await controller.getAllBalances(address);

    // Assuming `getTransactionsForAddress` returns the transactions
    res.json(transactions);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
