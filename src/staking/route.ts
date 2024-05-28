import { Request, Response, Router } from "express";
const controller = require("./controller");

const router: Router = Router();

// Adjusted to use query parameters for page and limit
router.get("/:address", async (req: Request, res: Response) => {
  try {
    const staked = BigInt("37856939905587111085");
    const pastRewards = BigInt("0");
    const rewardPerTokenPaid = BigInt("857569512242155371");

    const rew = await controller.getAllBalances(req.params.address);

    // Calculate accrued rewards
    const rewards = await controller.calculateAccruedRewards({
      staked,
      rewardPerTokenPaid,
      pastRewards,
    });

    // Respond with the calculated rewards
    res.json(rew);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
