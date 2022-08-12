const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle,
              raffleContract,
              vrfCoordinatorV2Mock,
              raffleEntranceFee,
              interval,
              player; // , deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners(); // could also do with getNamedAccounts
              //   deployer = accounts[0]
              player = accounts[1];
              await deployments.fixture(["mocks", "raffle"]); // Deploys modules with the tags "mocks" and "raffle"
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock"
              ); // Returns a new connection to the VRFCoordinatorV2Mock contract
              raffleContract = await ethers.getContract("Raffle"); // Returns a new connection to the Raffle contract
              raffle = raffleContract.connect(player); // Returns a new instance of the Raffle contract connected to player
              raffleEntranceFee = await raffle.getEntranceFee();
              interval = await raffle.getInterval();
          });

          describe("constructor", function () {
              it("intitiallizes the raffle correctly", async () => {
                  // Ideally, we'd separate these out so that only 1 assert per "it" block
                  // And ideally, we'd make this check everything
                  const raffleState = (
                      await raffle.getRaffleState()
                  ).toString();
                  // Comparisons for Raffle initialization:
                  assert.equal(raffleState, "0");
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId]["interval"]
                  );
              });
          });

          describe("enterRaffle", function () {
              it("reverts when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      // is reverted when not paid enough or raffle is not open
                      "Raffle__SendMoreToEnterRaffle"
                  );
              });

              it("records player when they enter", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  const contractPlayer = await raffle.getPlayer(0);
                  assert.equal(player.address, contractPlayer);
              });

              it("emits event on enter", async () => {
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.emit(
                      // emits RaffleEnter event if entered to index player(s) address
                      raffle,
                      "RaffleEnter"
                  );
              });

              it("doesn't allow entrance when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  });
                  // we pretend to be a keeper for a second
                  await raffle.performUpkeep([]); // changes the state to calculating for our comparison below
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWith(
                      // is reverted as raffle is calculating
                      "Raffle__RaffleNotOpen"
                  );
              });
          });

          describe("checkUpkeep", function () {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      "0x"
                  ); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded);
              });

              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  });
                  await raffle.performUpkeep([]); // changes the state to calculating
                  const raffleState = await raffle.getRaffleState(); // stores the new state
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      "0x"
                  ); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert.equal(
                      raffleState.toString() == "1",
                      upkeepNeeded == false
                  );
              });

              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() - 1,
                  ]);
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      "0x"
                  ); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded);
              });

              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      "0x"
                  ); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", () => {
              it("it can only run if checkUpkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const tx = await raffle.performUpkeep([]);
                  assert(tx);
              });

              it("reverts when checkUpkeep is false", async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  );
              });

              it("update raffle state, emit an event, and call the vrf coordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  });
                  const txResponse = await raffle.performUpkeep("0x"); // emits requestId
                  const txReceipt = await txResponse.wait(1); // waits 1 block
                  const raffleState = await raffle.getRaffleState(); // updates state
                  const requestId = txReceipt.events[1].args.requestId;
                  assert(requestId.toNumber() > 0);
                  assert(raffleState == 1); // 0 = open, 1 = calculating
              });
          });

          describe("fullfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
              });

              it("can only be called after performUpkeep", async () => {
                  await expect(
                      // check fulfillRandomWords() in vrfCoordinatorV2Interface
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request");

                  await expect(
                      // check fulfillRandomWords() in vrfCoordinatorV2Interface
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
              });

              it("pick a winner, reset lottery, and send money", async () => {
                  // 1, Add people to the lottery
                  const additionalPlayers = 3;
                  const startingAccountIndex = 1; // deployer = 0
                  const accounts = await ethers.getSigners();

                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalPlayers;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(
                          accounts[i]
                      );
                      await accountConnectedRaffle.enterRaffle({
                          value: raffleEntranceFee,
                      });
                  }
                  const startingTimestamp = await raffle.getLastTimeStamp();

                  // performUpkeep (mock being Chainlink Keepers)
                  // fulfillRandomWords (mock being Chainlink VRF)
                  // need to wait for fulfillRandomWords to be called => create a promise

                  // 3, Test fulfillRandomWords()
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the event!");
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner();

                              console.log(recentWinner);
                              console.log(accounts[0].address);
                              console.log(accounts[1].address);
                              console.log(accounts[2].address);
                              console.log(accounts[3].address);

                              const raffleState = await raffle.getRaffleState();
                              const endingTimestamp =
                                  await raffle.getLastTimeStamp();
                              const numPlayers =
                                  await raffle.getNumberOfPlayers();
                              const winnerEndingBalance =
                                  await accounts[1].getBalance();

                              assert.equal(numPlayers.toString(), "0");
                              assert.equal(raffleState.toString(), "0");
                              assert(endingTimestamp > startingTimestamp);

                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      raffleEntranceFee
                                          .mul(additionalPlayers)
                                          .add(raffleEntranceFee)
                                          .toString()
                                  )
                              );
                          } catch (e) {
                              reject(e);
                          }
                          resolve();
                      });
                      // setting up the listener

                      // 2, Only when the fulfillRandomWords is called, the function inside promise is fired and returns value
                      // below, we will fire the event, and the listener will pick it up, and resolve
                      const tx = await raffle.performUpkeep([]);
                      const txReceipt = await tx.wait(1);
                      const winnerStartingBalance =
                          await accounts[1].getBalance();
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });
          });
      });
