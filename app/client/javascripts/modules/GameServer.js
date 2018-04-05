/**
 * Created by ibrahimradwan on 3/3/18.
 */

export default function (gameStatus, serverGameStatus) {
    let module = {};
    let connectionEstablished = false;
    let _socket = io();
    let lastID = 0;

    module.init = function (setupGameEngine) {
        setupReceivers(setupGameEngine);

        _socket.on('connect', function () {
            // Send subscription request
            _socket.emit('subscribe', {});
        });
    };

    /**
     * Send my angle to the server
     */
    module.sendAngle = function () {
        _socket.emit('angle', gameStatus.status.anglesQueue.mouseAngles.slice(-1)[0]);

        gameStatus.status.anglesQueue.mouseAngles.push({id: ++gameStatus.status.anglesQueue.lastAngleID, angles: []});

        while (gameStatus.status.anglesQueue.anglesBufferSize > 20) {
            let size = gameStatus.status.anglesQueue.mouseAngles[0].angles.length;
            gameStatus.status.anglesQueue.mouseAngles.splice(0, 1);
            gameStatus.status.anglesQueue.anglesBufferSize -= size;
        }
    };

    /**
     * Send game status to the server
     */
    module.sendStatus = function () {
        // _socket.emit('game_status', gameStatus);
    };

    let setupReceivers = function (startGame) {
        _socket.on('player_info', function (playerInfo) {
            console.log('Incoming player info:', playerInfo);

            gameStatus.status.me.id = playerInfo.id;
        });

        _socket.on('game_status', function (receivedGameStatus) {
            // console.log('Incoming game status:', receivedGameStatus);

            gameStatus.status.env.serverResponseReceived = true;
            serverGameStatus = storeReceivedGameStatus(serverGameStatus, receivedGameStatus);

            // Start game
            if (!connectionEstablished) {
                gameStatus.init(receivedGameStatus);

                startGame();
                connectionEstablished = true;
            }
        });
    };

    let storeReceivedGameStatus = function (serverGameStatus, receivedGameStatus) {
        delete serverGameStatus.gems;
        delete serverGameStatus.players;

        return Object.assign(serverGameStatus, receivedGameStatus);
    };

    return module;
};
