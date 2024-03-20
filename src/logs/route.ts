import { Router, Request, Response } from "express";
const controller = require("./controllers");
const router:Router = Router();


router.get("/", (req: Request, res: Response) => {
    controller.getLogs(req, res);
});

router.get("/:address", (req: Request<{ address: string }>, res: Response) => {
    controller.getLogsByAddress(req, res);
});

router.get("/:address/:fromBlock/:toBlock", (req: Request<{ address: string; fromBlock: string; toBlock: string }>, res: Response) => {
    controller.getLogsByRange(req, res);
});



module.exports = router;