import { Router, type ErrorRequestHandler } from "express";
import { isAuthenticated } from "../middleware/authMiddleware.ts";


const router = Router();
router.use(isAuthenticated);

router.get('/', async (req, res) => {
  try {
    const user = req.user;
    if(!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({ error: `An error occured: ${error}`});
  }
})

export default router;