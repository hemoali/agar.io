// Imports
import PhysicsEngine from "./PhysicsEngine.js";
import UIEngine from "./UIEngine.js";
import Constants from "./Constants.js";

export default function (gameStatus, gameOverCallback) {
    let module = {};
    let constants = Constants();

    let physicsEngine;
    let uiEngine;

    // Timing variables
    let timers = {
        now: window.performance.now(),
        elapsed: window.performance.now(),
        lagToHandlePhysics: 0,
        forceServerPositionsTimer: 0
    };

    /**
     * Initializes the game engine by creating and initializing UI and physics engines.
     */
    module.init = function () {
        // Initialize p5 library
        module.p5Lib = new p5();

        // Initialize physics engine
        physicsEngine = PhysicsEngine(module.p5Lib);

        // Initialize UI engine
        uiEngine = UIEngine(module.p5Lib);
        uiEngine.init(gameStatus.status.me, gameStatus.status.players, gameStatus.status.gems);
    };

    /**
     * Resets game engine variables.
     */
    module.reset = function () {
        timers = {
            now: window.performance.now(),
            elapsed: window.performance.now(),
            lagToHandlePhysics: 0,
            forceServerPositionsTimer: 0
        };

        uiEngine.bindGameStatusObjects(gameStatus.status.me, gameStatus.status.players, gameStatus.status.gems);
    };

    /**
     * Main game loop function.
     * Keeps running until our main player got eaten or disconnected.
     */
    module.gameEngineLoop = function () {
        // Increase deltas to prepare for physics and forcing positions steps
        increaseTimers();

        // Update canvas objects
        updateCanvasObjects();

        // Move players
        applyPhysics();

        // Draw the game
        drawGame();

        // Stop when dead
        if (!gameStatus.status.env.running) {
            gameOverCallback();
            return;
        }

        // Repeat game loop
        requestAnimationFrame(module.gameEngineLoop);
    };

    let drawGame = function () {
        uiEngine.draw(timers.lagToHandlePhysics, timers.elapsed, gameStatus.status.env.ping);
    };

    let updateGamePhysics = function () {
        // Move players
        for (let key in gameStatus.status.players) {
            let player = gameStatus.status.players[key];

            if (player.id === gameStatus.status.me.id) continue;

            physicsEngine.movePlayerToPosition(player, {x: player.x, y: player.y});
        }

        // Move main player
        physicsEngine.moveMainPlayer(gameStatus.status.me, gameStatus.status.anglesQueue, gameStatus.status.env.lerping);
    };

    let increaseTimers = function () {
        let now = window.performance.now();

        // Calculate total time spent outside
        timers.elapsed = now - timers.now;
        timers.now = now;
        timers.lagToHandlePhysics += timers.elapsed;
        timers.forceServerPositionsTimer += timers.elapsed;
    };

    let applyPhysics = function () {
        // Lag is to much, happens with tab out, let's roll back to server now!
        if (timers.lagToHandlePhysics > constants.general.FORCE_SERVER_POSITIONS_TIME || gameStatus.status.me.forcePosition) {
            console.log("Force");
            forceServerPositions();
            return;
        }

        // Perform physics in a loop by the number of the threshold spent before getting here again
        while (timers.lagToHandlePhysics >= constants.general.UPDATE_PHYSICS_THRESHOLD) {
            // Update the game status (My location, players, gems, score, ... etc) and physics
            updateGamePhysics();

            timers.lagToHandlePhysics -= constants.general.UPDATE_PHYSICS_THRESHOLD;
        }
    };

    let forceServerPositions = function () {
        // Move players to server position
        for (let key in gameStatus.status.players) {
            physicsEngine.forceServerPosition(gameStatus.status.players[key]);
        }

        timers.lagToHandlePhysics = 0;
    };

    /**
     * Update the objects on the canvas (after getting update from server)
     */
    let updateCanvasObjects = function () {
        // Add new gems canvas params
        for (let key in gameStatus.status.newGems) {
            let gem = gameStatus.status.newGems[key];
            gameStatus.status.gems[gem.id] = gem;
            uiEngine.addGemCanvasParams(gameStatus.status.gems[gem.id]);
        }

        // Flush new gems array
        gameStatus.status.newGems = {};

        // Update players
        for (let key in gameStatus.status.players) {
            let player = gameStatus.status.players[key];

            if (!player.hasOwnProperty("canvasX")) { // New player generated -> Draw it
                uiEngine.addPlayerCanvasParams(player);
            }
        }

        // Add new players canvas params
        // for (let key in gameStatus.status.newPlayers) {
        //     let player = gameStatus.status.newPlayers[key];
        //     gameStatus.status.players[player.id] = player;
        //     uiEngine.addPlayerCanvasParams(player);
        // }

        // Flush new players array
        // gameStatus.status.newPlayers = {};

        // Fix z index of objects
        uiEngine.sortPlayersBySize();
    };

    return module;
};