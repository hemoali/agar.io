// Includes
var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Routes
require('../routes/index')(app, express);

// Game status
let gameStatus = {
    rooms: [
        {
            _id: 1,
            _players: [
                {
                    x: 200,
                    y: 300,
                    velocity: 2,
                    direction: 120, // Angle
                    color: "green",
                    radius: 30,
                    name: "P1",
                    score: 10,
                    id: 1
                }, {
                    x: 10,
                    y: 20,
                    velocity: 10,
                    direction: 10, // Angle
                    color: "red",
                    radius: 20,
                    name: "IAR",
                    id: 2,
                    score: 0
                }
            ],
            _gems: [
                {
                    x: 1000 / 2.6,
                    y: 1200 / 2.6,
                    color: "blue",
                    radius: 10
                }
            ]
        },
        {
            _id: 2,
            _players: [],
            _gems: []
        }]
};

// Sockets
io.on('connection', function (socket) {
    socket.on('subscribe', function (msg) {
        socket.join(1);
        socket.emit('game_status', gameStatus);
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});