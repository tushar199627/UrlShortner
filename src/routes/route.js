const express = require("express")
const router = express.Router();



const { shortUrl, getUrl } = require("../controller/urlcontroller")

router.post("/url/shorten", shortUrl);
router.get("/:urlCode", getUrl);








module.exports = router;