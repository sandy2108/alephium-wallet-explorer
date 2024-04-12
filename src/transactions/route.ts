import { Router, Request, Response } from "express";
const controller = require('./controller');

const router: Router = Router();

// Adjusted to use query parameters for page and limit
router.get("/:address", async (req: Request, res: Response) => {
    try {
        // Extracting `address` from the route parameters
        const { address } = req.params;
        // `page` and `limit` are now optional query parameters
        // Use a default value if they're not provided or if parsing fails
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;

        // Assuming `getTransactionsForAddress` is adjusted to take these parameters directly
        const transactions = await controller.getTransactionsForAddress(address, page, limit);
        
        // Assuming `getTransactionsForAddress` returns the transactions
        res.json(transactions);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
