const { ethers, network } = require("hardhat");
const fs = require("fs");
const {
    FRONT_END_ABI_FILE,
    FRONT_END_ADDRESS_FILE,
} = require("../helper-hardhat-config");

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Transfering information from back end to front end...");
        updateContractAddress();
        updateAbi();
    }
};

async function updateContractAddress() {
    const raffle = await ethers.getContract("Raffle");
    const currentAddress = JSON.parse(
        fs.readFileSync(FRONT_END_ADDRESS_FILE, "utf8")
    );
    const chainId = network.config.chainId.toString();
    if (chainId in currentAddress) {
        if (!currentAddress[chainId].includes(raffle.address)) {
            currentAddress[chainId].push(raffle.address);
        }
    } else {
        currentAddress[chainId] = [raffle.address];
    }
    fs.writeFileSync(FRONT_END_ADDRESS_FILE, JSON.stringify(currentAddress));
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(
        FRONT_END_ABI_FILE,
        raffle.interface.format(ethers.utils.FormatTypes.json)
    );
}
