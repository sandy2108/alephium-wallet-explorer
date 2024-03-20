import { Router, Request,Response } from "express";
const controller = require("./controllers");



const router: Router = Router();

// Define the route for fetching blocks within a range
router.get("/:from/:to", (req: Request<{ from: string; to: string }>, res: Response) => {
    controller.getBlockFromRange(req, res);
});

// Define the route for fetching a specific block by ID
router.get("/:block", (req: Request<{ block: string }>, res: Response) => {
    controller.getBlockById(req, res);
});

// Define the route for fetching all blocks
router.get("/", (req: Request, res: Response) => {
    controller.getBlock(req, res);
});


module.exports = router;
