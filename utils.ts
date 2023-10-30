import fs from "fs";
import {provider} from "./index";
import {ethers} from "ethers";
import {maxGas} from "./config";
import logger from "./logger";

export function sleep(min: number, max: number): Promise<void> {
    let sleepTime = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    logger.info(`Sleeping for ${sleepTime / 1e3} seconds...`);
    return new Promise(resolve => setTimeout(resolve, sleepTime));
}


export function getPrivateKeys(shuffle: string) {
    let privateKeys = fs.readFileSync(`./private_keys.txt`, 'utf-8').split('\n').map(wallet => wallet.trim());
    const notShuffledPrivateKeys = [...privateKeys];
    if (shuffle === 'yes') {
        for (let i = privateKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [privateKeys[i], privateKeys[j]] = [privateKeys[j], privateKeys[i]]; // Swap elements
        }
    }

    return [privateKeys, notShuffledPrivateKeys];
}


export async function checkGas() {
    let gasPrice = await provider.getGasPrice();

    while (gasPrice.gte(ethers.utils.parseUnits(maxGas, 'gwei'))) {
        await new Promise(resolve => setTimeout(resolve, 60 * 1000)); // Wait for 1 minute
        gasPrice = await provider.getGasPrice();
    }
}