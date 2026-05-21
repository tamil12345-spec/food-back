const express        = require("express");
const router         = express.Router();
const { register, login, getMe, deleteAccount } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login",    login);
router.get("/me",        authMiddleware, getMe);
router.delete("/delete", authMiddleware, deleteAccount);

module.exports = router;