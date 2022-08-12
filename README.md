# Hardhat Lottery

Hardhat Lottery is a simple smart contract raffle, a showcase of using Hardhat framework, Chainlink services along with Node.js.

# Quick Overview

Using [Chainlink VRF](https://docs.chain.link/docs/chainlink-vrf/) to find a random winner of the lottery.

[Chainlink Keepers](https://docs.chain.link/docs/chainlink-keepers/introduction/) is also used to automatically ignite the action of announcing the next winner after an amount of time.

Introduction to _events_ in Solidity and learn how to test them.

Using Hardhat Methods for testing.

# Getting Started

## Requirements

-   git
-   Node.js
-   yarn

## Quick Start

```
git clone git@github.com:nvtrinh2001/hardhat-lottery.git
cd hardhat-lottery
yarn
yarn hardhat
```

# Deploy

## Hardhat Deployment

```
yarn hardhat deploy
```

## Local Deployment

Create your local hardhat network:

```
yarn hardhat node
```

## Testnet or Mainnet

Setup environment variables:

-   PRIVATE_KEY
-   RINKEBY_RPC_URL

Get testnet ETH from faucets.chain.link

Deploy:

```
yarn hardhat deploy --network rinkeby
```

# Test

## Unit tests

```
yarn run test
```

## Staging tests

```
yarn run test:staging
```

## Test coverage

```
yarn run coverage
```

## Estimate Gas

Run:

```
yarn hardhat test
```

Gas estimation will be saved in `gas-report.txt` if you enable it.

# Verify on Etherscan

Get your API key from Etherscan, then deploying the application will automatically verify the contracts for you.
