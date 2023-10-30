import { ethers } from 'ethers';
import fs from "fs";
// @ts-ignore
import * as solc from 'solc';
import logger from "./logger";
import { randomContract, shuffle, pause } from "./config";
import { checkGas, getPrivateKeys, sleep } from "./utils";

export const provider = new ethers.providers.JsonRpcProvider('https://rpc.ankr.com/scroll');

function generateRandomContract() {
    try {
        const contractParts = [];
        const numOfRandomFunctions = Math.floor(Math.random() * 10) + 1;
        const contractName = 'C' + Math.random().toString(36).substring(2);

        const minorVersion = Math.floor(Math.random() * 23); // 0 to 22
        const solidityVersion = `0.8.${minorVersion}`;

        const randomVariableName = 'v' + Math.random().toString(36).substring(7);
        const randomStateVariable = `uint public ${randomVariableName} = ${Math.floor(Math.random() * 1000)};`;
        const randomConstant = `uint public constant c${Math.random().toString(36).substring(7)} = ${Math.floor(Math.random() * 1000)};`;

        contractParts.push(randomStateVariable);
        contractParts.push(randomConstant);

        const randomConstructor = `
            constructor() {
                ${randomVariableName} = ${Math.floor(Math.random() * 1000)};
            }
        `;

        contractParts.push(randomConstructor);

        for (let i = 0; i < numOfRandomFunctions; i++) {
            const functionName = 'f' + Math.random().toString(36).substring(7);
            const variableName = 'v' + Math.random().toString(36).substring(7);
            const randomOperation = ['+', '-', '*', '/', '%'][Math.floor(Math.random() * 5)];
            const randomValue = Math.floor(Math.random() * 1000);

            const randomFunction = `
                function ${functionName}() public pure returns (uint) {
                    uint ${variableName} = ${randomValue};
                    return ${variableName} ${randomOperation} ${randomValue};
                }
            `;

            contractParts.push(randomFunction);
        }

        const contractSource = `
            // SPDX-License-Identifier: MIT
            pragma solidity ^${solidityVersion};

            contract ${contractName} {
                ${contractParts.join('\n')}
            }
        `;

        return { contractSource, contractName };
    } catch (error) {
        logger.error('Failed to generate random contract:', error);
        throw error;
    }
}

async function compileContract(contractSource: string, contractName: string) {
    try {
        const input = {
            language: 'Solidity',
            sources: {
                [contractName + '.sol']: {
                    content: contractSource,
                },
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['*'],
                    },
                },
            },
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));

        if (!output.contracts || !output.contracts[contractName + '.sol'] || !output.contracts[contractName + '.sol'][contractName]) {
            throw new Error('Compilation failed. Please check the contract code and the input for the compiler.');
        }

        const contract = output.contracts[contractName + '.sol'][contractName];
        return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
    } catch (error) {
        logger.error('Failed to compile contract:', error);
        throw error;
    }
}

async function deployContract(privateKey: string, contractABI: any = [], contractBytecode: string) {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const factory = new ethers.ContractFactory(contractABI, contractBytecode, wallet);

        const contract = await factory.deploy();
        await contract.deployed();
        await sleep(20, 30);
        logger.success(`Contract successfully deployed - https://scrollscan.com/address/${contract.address}#code`);
        fs.appendFileSync('./success_private_keys.txt', `${privateKey}\n`);

    } catch (error) {
        logger.error('Failed to deploy contract:', error);
        throw error;
    }
}

async function main() {
    try {
        const [privateKeys, notShuffledPrivateKeys] = getPrivateKeys(shuffle)
        await checkGas()
        let i = 1
        for (const privateKey of privateKeys) {
            try {
                const wallet = new ethers.Wallet(privateKey);
                const walletNumber = notShuffledPrivateKeys.indexOf(privateKey) + 1;
                logger.info(`${i} - ${walletNumber} | ${wallet.address}`);

                if (randomContract === 'yes') { // Deploy random contract
                    const { contractSource, contractName } = generateRandomContract();
                    const { abi, bytecode } = await compileContract(contractSource, contractName);
                    await deployContract(wallet.privateKey, abi, bytecode);
                } else { // Deploy 0x bytecode
                    await deployContract(wallet.privateKey, [], '0x');
                }
                await sleep(pause[0], pause[1]);
                console.log('\n\n')
                i++;
            } catch (error) {
                logger.error(`Error processing private key at index ${i}:`, error);
                await sleep(15, 30)
            }
        }
    } catch (error) {
        logger.error('An error occurred in the main function:', error);
    }
}

main();
