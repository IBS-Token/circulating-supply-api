require('dotenv').config();
const axios = require('axios');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Environment Variables
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const LOCKED_WALLETS = process.env.LOCKED_WALLETS.split(',');

// Logging Middleware
const logger = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
};
app.use(logger);

// Helper Function to Format BigInt
const formatBigInt = (value, decimals = 18) => {
    const divisor = BigInt(10 ** decimals);
    const wholePart = value / divisor;
    const formatted = wholePart.toLocaleString('en-US');
    return formatted;
};

// Get Total Supply from Polygonscan
const getTotalSupply = async () => {
    try {
        const url = `https://api.polygonscan.com/api?module=stats&action=tokensupply&contractaddress=${CONTRACT_ADDRESS}&apikey=${POLYGONSCAN_API_KEY}`;
        const response = await axios.get(url);

        if (response.data.status !== "1") {
            console.error("Error from Polygonscan:", response.data.message);
            throw new Error(`Invalid response from totalSupply API: ${JSON.stringify(response.data)}`);
        }

        console.log("Total Supply Response:", response.data.result);
        return BigInt(response.data.result);
    } catch (error) {
        console.error("Failed to fetch total supply:", error.message);
        throw error;
    }
};

// Get Balance of Locked Wallets
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const getLockedBalances = async () => {
    try {
        const balances = {};

        for (let i = 0; i < LOCKED_WALLETS.length; i++) {
            const wallet = LOCKED_WALLETS[i];
            console.log(`Fetching balance for ${wallet}`);

            const url = `https://api.polygonscan.com/api?module=account&action=tokenbalance&contractaddress=${CONTRACT_ADDRESS}&address=${wallet}&tag=latest&apikey=${POLYGONSCAN_API_KEY}`;

            const response = await axios.get(url);

            if (response.data.status !== "1") {
                console.error(`Error fetching balance for ${wallet}: ${JSON.stringify(response.data)}`);
                throw new Error(`Failed to fetch balance for wallet ${wallet}`);
            }

            balances[wallet] = BigInt(response.data.result);

            // Introduce a delay of 300ms (5 calls per second limit → 1000ms/5 = 200ms, adding buffer)
            await delay(300);  
        }

        return balances;
    } catch (error) {
        console.error("Failed to fetch locked balances:", error.message);
        throw error;
    }
};

// Endpoint to get Circulating Supply
app.get("/api/circulating-supply", async (req, res) => {
    try {
        console.log("Fetching total supply and locked balances...");

        const totalSupply = await getTotalSupply();
        const lockedBalances = await getLockedBalances();
        
        console.log("Total Supply:", totalSupply.toString());
        console.log("Locked Balances:", lockedBalances);

        // Calculate total locked
        let totalLocked = BigInt(0);
        for (const balance of Object.values(lockedBalances)) {
            totalLocked += balance;
        }

        console.log("Total Locked:", totalLocked.toString());

        // Calculate circulating supply and convert to string
        const circulatingSupply = (totalSupply - totalLocked).toString();

        console.log("Circulating Supply:", circulatingSupply);

        res.json({ circulatingSupply: (circulatingSupply / BigInt("1000000000000000000")).toString() });
    } catch (error) {
        console.error("Error fetching circulating supply:", error.message);
        res.status(500).json({ error: "Failed to fetch circulating supply" });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
