import { Router, Request, Response } from "express";
const controller = require("./controllers");




const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
    controller.getTransactions(req, res);
});

router.get("/:txn", (req: Request<{ txn: string }>, res: Response) => {
    controller.getTransactionsByHashandLogs(req, res);
});

module.exports = router;