// Imports
const GameConfig = require("./configs")();
const Room = require("./models/Room");

class GameServer {
    constructor(io) {
        this.io = io;

        // All game players and all game rooms
        this.gamePlayers = {};
        this.gameRooms = {};

        this.roomsExist = false;
        this.nextRoomID = 0;
    }

    init() {
        let self = this;
        module.LRAI = 0;

        self.io.on('connection', function (socket) {
            // Add new player to a room upon receiving subscription message
            socket.on('subscribe', function () {
                self.roomsExist = true;
                socket.join(self.addNewPlayer(socket.id));
            });

            // Updates player's angle
            socket.on('angle', function (anglesBuffer) {
                self.updatePlayerPosition(socket.id, anglesBuffer);
            });

            // Remove player on disconnection
            socket.on('disconnect', function () {
                self.removePlayer(socket.id);
            })
        });

        // Regenerate game gems
        setInterval(self.regenerateGems.bind(self), GameConfig.REGENERATE_GEMS_RATE);

        // Send room statuses to clients
        setInterval(self.sendRoomsGameStatuses.bind(self), GameConfig.SEND_GAME_STATUSES_RATE);
    };

    addNewPlayer(playerSocketID) {
        let roomID = -1;

        // Search for any game having a free slot
        for (let room in this.gameRooms) {
            let gameRoom = this.gameRooms[room];
            if (gameRoom.getPlayersCount() < GameConfig.ROOM_MAX_PLAYERS) {
                roomID = gameRoom.id;
            }
        }

        if (roomID === -1) {
            // All rooms are full, create a new one
            roomID = this.nextRoomID++;
            this.gameRooms[roomID] = new Room(roomID);
        }

        let player = this.gameRooms[roomID].addPlayer();
        let playerID = player.id;
        this.gamePlayers[playerSocketID] = {roomID, playerID};

        this.sendPlayerInfo(playerSocketID, playerID, roomID, player.lastAngleTimeStamp);

        return roomID;
    };

    sendPlayerInfo(playerSocketID, playerID, roomID, lastAngleTimeStamp) {
        let playerInfo = {};
        playerInfo.id = playerID;
        playerInfo.lastReceivedAngleID = -1;
        playerInfo.lastAngleTimeStamp = lastAngleTimeStamp;

        this.io.to(playerSocketID).emit('player_info', playerInfo);
        this.io.to(playerSocketID).emit('initial_game_status', this.gameRooms[roomID].getGameStatus(true));
    };

    updatePlayerPosition(playerSocketID, anglesBuffer) {
        if (!this.gamePlayers.hasOwnProperty(playerSocketID)) return;

        let playerID = this.gamePlayers[playerSocketID].playerID;
        let roomID = this.gamePlayers[playerSocketID].roomID;

        if (this.gameRooms[roomID].isPlayerAlive(playerID)) {
            this.gameRooms[roomID].simulatePlayer(playerID, anglesBuffer);
        }
    };

    setNewPlayerInfo(playerSocketID, newPlayerInfo) {
        let playerID = this.gamePlayers[playerSocketID].playerID;
        let roomID = this.gamePlayers[playerSocketID].roomID;

        if (this.gameRooms[roomID].isPlayerAlive(playerID)) {
            this.gameRooms[roomID].setPlayerInfo(playerID, newPlayerInfo);
        }
    };

    removePlayer(playerSocketID) {
        if (!this.gamePlayers.hasOwnProperty(playerSocketID)) return;

        console.log("A Player Disconnected");

        let playerID = this.gamePlayers[playerSocketID].playerID;
        let roomID = this.gamePlayers[playerSocketID].roomID;

        if (this.gameRooms[roomID].isPlayerAlive(playerID)) {
            this.gameRooms[roomID].killPlayer(playerID);
        }
    };

    sendRoomsGameStatuses() {
        // Loop over all game rooms and run simulate
        for (let room in this.gameRooms) {
            let gameRoom = this.gameRooms[room];
            this.io.in(gameRoom.id).emit('game_status', gameRoom.getGameStatus(false));
        }
    };

    regenerateGems() {
        if (!this.roomsExist) return;

        // Loop over all game rooms and run simulate
        for (let room in this.gameRooms) {
            let gameRoom = this.gameRooms[room];
            gameRoom.addGems();
        }
    };
}

module.exports = GameServer;