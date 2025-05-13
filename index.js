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
    const url = `https://api.polygonscan.com/api?module=stats&action=tokensupply&contractaddress=${CONTRACT_ADDRESS}&apikey=${POLYGONSCAN_API_KEY}`;
    console.log(`Fetching Total Supply from: ${url}`);
    try {
        const response = await axios.get(url);

        if (response.data.status !== '1') {
            console.error(`Error fetching total supply: ${JSON.stringify(response.data)}`);
            throw new Error(`Invalid response from totalSupply API: ${JSON.stringify(response.data)}`);
        }

        console.log(`Total Supply fetched: ${response.data.result}`);
        return BigInt(response.data.result);
    } catch (error) {
        console.error(`Failed to fetch total supply: ${error.message}`);
        throw error;
    }
};

// Get Balance of Locked Wallets
const getLockedBalances = async () => {
    try {
        const balancePromises = LOCKED_WALLETS.map(async (wallet) => {
            const url = `https://api.polygonscan.com/api?module=account&action=tokenbalance&contractaddress=${CONTRACT_ADDRESS}&address=${wallet}&apikey=${POLYGONSCAN_API_KEY}`;
            console.log(`Fetching balance for wallet: ${wallet}`);
            
            const response = await axios.get(url);
            
            if (response.data.status !== '1') {
                console.error(`Error fetching balance for ${wallet}: ${JSON.stringify(response.data)}`);
                throw new Error(`Invalid response from balance API for ${wallet}: ${JSON.stringify(response.data)}`);
            }

            console.log(`Balance fetched for ${wallet}: ${response.data.result}`);
            return BigInt(response.data.result);
        });

        const balances = await Promise.all(balancePromises);
        const totalLocked = balances.reduce((acc, balance) => acc + balance, BigInt(0));
        console.log(`Total Locked Balance: ${totalLocked}`);
        return totalLocked;
    } catch (error) {
        console.error(`Failed to fetch locked balances: ${error.message}`);
        throw error;
    }
};

// Endpoint to get Circulating Supply
app.get('/api/circulating-supply', async (req, res) => {
    try {
        const totalSupply = await getTotalSupply();
        const totalLocked = await getLockedBalances();
        const circulatingSupply = totalSupply - totalLocked;

        console.log(`Circulating Supply Calculated: ${circulatingSupply}`);
        res.json({ circulatingSupply: formatBigInt(circulatingSupply) });
    } catch (error) {
        console.error(`Error in /api/circulating-supply: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch circulating supply' });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});