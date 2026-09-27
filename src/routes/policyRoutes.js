const express = require("express");

const {
  searchPoliciesByUsername,
  getPoliciesByUser
} = require("../controllers/policyController");

const router = express.Router();

router.get(
  "/policies/search",
  searchPoliciesByUsername
);

router.get(
  "/policies/summary",
  getPoliciesByUser
);


module.exports = router;