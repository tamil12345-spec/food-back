const express    = require("express");
const router     = express.Router();
const { getRestaurants, getRestaurantById, getMenu } = require("../controllers/restaurantController");

router.get("/",           getRestaurants);
router.get("/:id",        getRestaurantById);
router.get("/:id/menu",   getMenu);

module.exports = router;
