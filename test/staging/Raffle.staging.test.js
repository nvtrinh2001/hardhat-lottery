const { assert, expect } = require("chai");
const { network, deployments, ethers, getNamedAccounts } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, raffleEntranceFee, deployer;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              raffle = await ethers.getContract("Raffle", deployer);
              raffleEntranceFee = await raffle.getEntranceFee();
          });

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
                  // enter the raffle
                  const startingTimeStamp = await raffle.getLastTimeStamp();
                  const accounts = await ethers.getSigners();

                  // setup listener before entering the raffle
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!");
                          try {
                              // add assert here
                              const recentWinner =
                                  await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerEndingBalance =
                                  await accounts[0].getBalance();
                              const endingTimestamp =
                                  await raffle.getLastTimeStamp();

                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(raffleState.toString(), "0");
                              assert(endingTimestamp > startingTimeStamp);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(raffleEntranceFee)
                                      .toString()
                              );

                              resolve();
                          } catch (e) {
                              console.log(e);
                              reject(e);
                          }
                      });
                  });

                  // Then entering the raffle
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  const winnerStartingBalance = await accounts[0].getBalance();
              });
          });
      });
