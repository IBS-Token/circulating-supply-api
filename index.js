const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

const POLYGONSCAN_API_KEY = "NZXCNXHZAYKPJXVVGCA1U5RAK92NJCJKN9";
const CONTRACT_ADDRESS = "0xB9dF5FDa1c435cD4017a1F1F9111996520b64439";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dead";
const DECIMALS = BigInt(1e18);
const LOCKED_WALLETS = [
  "0x1aAa6B88225A4Bd37Fd2257567b8e128384d5011",
  "0x3954984395002107C5f6aa1115c7EBA9AB4F78b0",
  "0x4cc463F677329fa4481CA496BAD2aa398afB75dC",
  "0x580ecA07c3Ad6eD6c35C071F44Df46cCaFEb5094",
  "0xEDDf191e5581C7aFd9B634B48C1c4a2cAbAeF8D4"
];

// Get total supply
async function getTotalSupply() {
  const url = https://api.polygonscan.com/api?module=stats&action=tokensupply&contractaddress=${CONTRACT_ADDRESS}&apikey=${POLYGONSCAN_API_KEY};
  const response = await axios.get(url);

  if (!response.data || response.data.status !== "1") {
    throw new Error(Invalid response from totalSupply API: ${JSON.stringify(response.data)});
  }

  return BigInt(response.data.result);
}

// Get wallet balance
async function getWalletBalance(wallet) {
  const url = https://api.polygonscan.com/api?module=account&action=tokenbalance&contractaddress=${CONTRACT_ADDRESS}&address=${wallet}&tag=latest&apikey=${POLYGONSCAN_API_KEY};
  const response = await axios.get(url);

  if (!response.data || response.data.status !== "1") {
    throw new Error(Invalid response from wallet balance API: ${JSON.stringify(response.data)});
  }

  return BigInt(response.data.result);
}

// Root route
app.get("/", (req, res) => {
  res.send("✅ Circulating Supply API is running. Use /circulating-supply to get token data.");
});

// Circulating supply route
app.get("/circulating-supply", async (req, res) => {
  try {
    const totalSupply = await getTotalSupply();
    const burnedTokens = await getWalletBalance(BURN_ADDRESS);

    let lockedTokens = BigInt(0);
    for (const wallet of LOCKED_WALLETS) {
      const balance = await getWalletBalance(wallet);
      lockedTokens += balance;
    }

    const circulatingSupply = totalSupply - burnedTokens - lockedTokens;

    const format = (value) => (value / DECIMALS).toString();

    res.json({
      token: CONTRACT_ADDRESS,
      totalSupply: format(totalSupply),
      burnedTokens: format(burnedTokens),
      lockedTokens: format(lockedTokens),
      circulatingSupply: format(circulatingSupply)
    });
  } catch (error) {
    console.error("❌ Error fetching data:", error.message);
    res.status(500).json({ error: "Error fetching data from Polygonscan." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(✅ API running on http://localhost:${PORT});
});