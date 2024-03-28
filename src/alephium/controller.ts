type Block = {
    total: number;
    blocks: {
        hash: string;
        timestamp: number;
        chainFrom: number;
        chainTo: number;
        height: number;
        txNumber: number;
        mainChain: boolean;
        hashRate: string;
    }[];
};

const endpoint: string = "https://backend.testnet.alephium.org/blocks";

export async function getLatestBlock(): Promise<Block> {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const data: Block = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}
