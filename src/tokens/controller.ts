

type Token = {
    tokenId: string;
    balance: number;
    lockedBalance: string;
}

type NativeToken = {
    balance: number;
    lockedBalance: string;
}

async function getNativeTokenBalance(address: string): Promise<NativeToken[]> {
   const endpoint = `https://backend.mainnet.alephium.org/addresses/${address}/balance`

   const response = await fetch(endpoint);
   const data = await response.json();
   return data;
}

async function getTokenBalance(address: string): Promise<Token[]> {
    const endpoint = `https://backend.mainnet.alephium.org/addresses/${address}/tokens-balance`
    const response = await fetch(endpoint);
    const data = await response.json();
    return data;
}

export async function getAllBalances(address: string): Promise<(NativeToken[] | Token[])[]> {
    try {
        // Fetch native token balance
        const nativeTokenBalancePromise = getNativeTokenBalance(address);
        // Fetch token balances
        const tokenBalancesPromise = getTokenBalance(address);

        // Await both promises
        const [nativeTokenBalance, tokenBalances] = await Promise.all([nativeTokenBalancePromise, tokenBalancesPromise]);

        // Return merged data as a single array
        return [nativeTokenBalance, tokenBalances];
    } catch (error) {
        console.error("Error fetching balances:", error);
        throw error;
    }
}


module.exports = {
    getAllBalances
}