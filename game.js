/**
 * Grab the pellets as fast as you can!
 **/

var inputs = readline().split(' ');
const width = parseInt(inputs[0]); // size of the grid
const height = parseInt(inputs[1]); // top left corner is (x=0, y=0)
let gameMap = []; // Save the game map into an array
let lastPos = [];

for (let i = 0; i < height; i++) {
    const row = readline(); // one line of the grid: space " " is floor, pound "#" is wall
    gameMap[i] = row.split("");
}
// ~~~ Extra Functions ~~~

// Find the distance between two points
const findPointDistance = (x1, y1, x2, y2) => {
    return Math.hypot(x2 - x1, y2 - y1);
}

// Find Super Pellets, v.2
const findSuperPellet = (allPacs, superPellets, turnPellets) => {
    let command = "";
    pacCommands = [];    

    superPellets.forEach(sp => {        
        let pacDist = 1000;
        let bestPac = undefined;

        allPacs.forEach(pac => {
            if (pac.mine) {
                const distance = findPointDistance(pac.x, pac.y, sp[0], sp[1]);
                if (distance < pacDist && pacCommands[pac.pacId] === undefined) {
                    pacDist = distance;
                    bestPac = pac;
                }
            }            
        });
        // In case something went wrong
        if (bestPac === undefined) return;
        
        if (bestPac.abilityCooldown === 0 && pacDist < 11) {
            command = { id: bestPac.pacId, action: "SPEED", params: "" };
        } else {
            command = { id: bestPac.pacId, action: "MOVE", params: `${sp[0]} ${sp[1]}`};
        }

        turnPellets.push({
            x: sp[0],
            y: sp[1],
            id: bestPac.pacId,
        });

        pacCommands[bestPac.pacId] = command;
    });
    
    return pacCommands;
}

// Find a small Pellet
const findSmallPellet = (pac, pelletArray, turnPellets, myScore, opponentScore) => {
    let bestPellet = [-1, -1, 1000];

    pelletArray.forEach((superPellet) => {
        // If Pellet already tagged, skip
        if (turnPellets.filter(pellet => pellet.x == superPellet[0] && pellet.y == superPellet[1]).length > 0){
            return;
        }
        const distance = findPointDistance(pac.x, pac.y, superPellet[0], superPellet[1]);

        // If distance is smaller
        if (distance < bestPellet[2]) {
            bestPellet = [superPellet[0], superPellet[1], distance];
        }
    });

    // If no Pellet found, go to nearest unexplored area
    if (bestPellet[0] == -1 && bestPellet[1] == -1) {        
        
        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                if (gameMap[j][i] == " ") {
                    const distance = findPointDistance(pac.x, pac.y, i, j);
                    if (distance < bestPellet[2]) {
                        if (turnPellets.filter(pel => pel.x === bestPellet[0] && pel.y === bestPellet[1]).length === 0) {
                            bestPellet = [i, j, distance];
                        }
                    }
                }
            }
        }
    }

    turnPellets.push({
                    x: bestPellet[0],
                    y: bestPellet[1],
                    id: pac.pacId
                });
    
    let command = "";
    
    if (pac.abilityCooldown === 0 && myScore < opponentScore) {
        command = { id: pac.pacId, action: "SPEED", params: "" };
    } else {
        command = { id: pac.pacId, action: "MOVE", params: `${bestPellet[0]} ${bestPellet[1]}`};
    }   
    
    return command;
    
};

// Kill Command
const killCommand = (myPac, enemyPac, distance) => {
    let command = "";
    // Type of Pac
    let type = myPac.typeId;
    switch(enemyPac.typeId){
        case 'ROCK':
            type = 'PAPER';
            break;
        case 'PAPER':
            type = 'SCISSORS';
            break;
        case 'SCISSORS':
            type = 'ROCK';
            break;
    }
    // Cases
    // Guess Opponent's next move
    if (distance <= 1 && myPac.abilityCooldown == 0 && enemyPac.abilityCooldown == 0) {
        let guessType = myPac.typeId;
        switch (guessType) {
            case 'ROCK':
                guessType = 'SCISSORS';
                break;
            case 'PAPER':
                guessType = 'ROCK';
                break;
            case 'SCISSORS':
                guessType = 'PAPER';
                break;
        }
        command = { id: myPac.pacId, action: "SWITCH", params: guessType }
        
        console.error("Pac: " + myPac.pacId + " Distance: " + distance + " Case 1");
    }
    else if (distance <= 2 && myPac.abilityCooldown == 0) {                  
        
        if (type != myPac.typeId){
            command = { id: myPac.pacId, action: "SWITCH", params: type };
        } else {
            command = { id: myPac.pacId, action: "MOVE", params: `${enemyPac.x} ${enemyPac.y}` };
        }
        
        console.error("Pac: " + myPac.pacId + " Distance: " + distance + " Case 2");              
    }
    // If the enemy is on Cooldown and we have the correct type to win
    else if (distance < enemyPac.abilityCooldown && type == myPac.typeId) {
        command = { id: myPac.pacId, action: "MOVE", params: `${enemyPac.x} ${enemyPac.y}` };

        console.error("Pac: " + myPac.pacId + " Distance: " + distance + " Case 3");
    }
    // if my CD will be ready by the time of the collision
    else if (distance/2 > myPac.abilityCooldown) {
        command = { id: myPac.pacId, action: "MOVE", params: `${enemyPac.x} ${enemyPac.y}` };

        console.error("Pac: " + myPac.pacId + " Distance: " + distance + " Case 4");
    }
    // If we are losing, flee
    else {
        const i = myPac.x - enemyPac.x;
        const j = myPac.y - enemyPac.y;
        let xx = 0;
        let yy = 0;
        
        // They are on the same X
        if (i == 0) {
            // If my Pac is lower than Enemy, go DOWN
            if (j > 0 && myPac.y + 1 < height && gameMap[myPac.y + 1][myPac.x] != "#") {
                yy = myPac.y + 1;
                xx = myPac.x;                
            }
            // Else, go Up
            else if (j < 0 && myPac.y - 1 >= 0 && gameMap[myPac.y - 1][myPac.x] != "#") {
                yy = myPac.y - 1;
                xx = myPac.x;
            }
            // Else go Left or Right
            else {
                // Try left
                if (myPac.x - 1 >= 0 && gameMap[myPac.y][myPac.x - 1] != "#") {
                    yy = myPac.y;
                    xx = myPac.x - 1;
                }
                // Or right
                else if (myPac.x + 1 < width && gameMap[myPac.y][myPac.x + 1] != "#") {
                    yy = myPac.y;
                    xx = myPac.x + 1;
                }
                // Else give up
                else {
                    return;
                }
            }
        }
        // If they are on the same Y
        else if (j == 0) {
            // If my Pac is on the Right, go Right
            if (i > 0 && myPac.x + 1 < width && gameMap[myPac.y][myPac.x +1] != "#") {
                xx = myPac.x + 1;
                yy = myPac.y;
            }
            // Or go Left
            else if (i < 0 && myPac.x - 1 >= 0 && gameMap[myPac.y][myPac.x - 1] != "#") {
                xx = myPac.x -1;
                yy = myPac.y;
            }
            // or try Up / Down
            else {
                // Down
                if (myPac.y + 1 < height && gameMap[myPac.y + 1][myPac.x] != "#") {
                    yy = myPac.y + 1;
                    xx = myPac.x;
                }
                // Up
                else if (myPac.y - 1 >= 0 && gameMap[myPac.y - 1][myPac.x] != "#") {
                    yy = myPac.y - 1;
                    xx = myPac.x;
                }
                // Else give up
                else {
                    return;
                }
            }
        }
        // Else return.
        else {
            return;
        }

        command = { id: myPac.pacId, action: "MOVE", params: `${xx} ${yy}` };

        console.error("Pac: " + myPac.pacId + " Distance: " + distance + " Case 5");
    }

    return command;
};

// Avoid Collisions
const avoidCollisions = (allPacs, pacCommands, lastPos) => {
    for (let i = 0; i < allPacs.length; i++) {
        const pac = allPacs[i];
        if (!pac.mine) continue; // skip opponents

        if (lastPos[pac.pacId] === undefined) {
            lastPos[pac.pacId] = [[0, 0]];
        } else {
            const stepOne = lastPos[pac.pacId].pop();
            if (stepOne[0] === pac.x && stepOne[1] === pac.y) {
                // Backtrack
                const stepTwo = lastPos[pac.pacId].pop();
                // Check again
                if (stepTwo[0] === stepOne[0] && stepTwo[1] === stepOne[1]) {
                    const stepThree = lastPos[pac.pacId].pop();
                    pacCommands[pac.pacId] = { id: pac.pacId, action: "MOVE", params: `${stepThree[0]} ${stepThree[1]}`};
                    // Let's say that only one collision per turn, so break
                    break;  
                }
                else {
                    lastPos[pac.pacId].push(stepTwo);
                    lastPos[pac.pacId].push(stepOne);
                    lastPos[pac.pacId].push([pac.x, pac.y]);
                }
            } else {
                lastPos[pac.pacId].push(stepOne);
                lastPos[pac.pacId].push([pac.x, pac.y]);
            }
        }
    };
}

// ~~~ End Extra Functions ~~~

// game loop
while (true) {
    var inputs = readline().split(' ');
    const myScore = parseInt(inputs[0]);
    const opponentScore = parseInt(inputs[1]);
    const visiblePacCount = parseInt(readline()); // all your pacs and enemy pacs in sight

    const allPacs = []; // save all pacs in an array

    for (let i = 0; i < visiblePacCount; i++) {
        var inputs = readline().split(' ');
        const pacId = parseInt(inputs[0]); // pac number (unique within a team)
        const mine = inputs[1] !== '0'; // true if this pac is yours
        const x = parseInt(inputs[2]); // position in the grid
        const y = parseInt(inputs[3]); // position in the grid
        const typeId = inputs[4]; // unused in wood leagues
        const speedTurnsLeft = parseInt(inputs[5]); // unused in wood leagues
        const abilityCooldown = parseInt(inputs[6]); // unused in wood leagues

        // save Pac as an object into an Array
        allPacs[i] = { pacId, mine, typeId, speedTurnsLeft, abilityCooldown, x, y };        
    }    
    
    const visiblePelletCount = parseInt(readline()); // all pellets in sight

    const pelletArray = []; // save the pellets in an array

    for (let i = 0; i < visiblePelletCount; i++) {
        var inputs = readline().split(' ');
        const x = parseInt(inputs[0]);
        const y = parseInt(inputs[1]);
        const value = parseInt(inputs[2]); // amount of points this pellet is worth

        pelletArray[i] = [x, y, value]; // save as array, maybe faster?
    }

    // Write an action using console.log()
    // To debug: console.error('Debug messages...');
    
    // the commands, each turn, for all the Pacs
    let pacCommands = [];
    // helpfull array that contains each GOAL for each round
    // so that it won't overlap over two Pacs
    let turnPellets = []; 

    // First, run the FindSuperPellet to asign Pac to Super Pellets
    const superPellets = pelletArray.filter((pellet) => pellet[2] == 10);
    
    if (superPellets.length > 0) {
        pacCommands = findSuperPellet(allPacs, superPellets, turnPellets);
    }
    
    allPacs.forEach((pac) => {
        // Set cell to Visited (*)
        gameMap[pac.y][pac.x] = "*";
        if (pac.mine) {         
            // first check if we already have a command for this Pac
            if (pacCommands[pac.pacId]) {
                return; // skip 
            }

            // Else, go at a small one
            else {                
                pacCommands[pac.pacId] = findSmallPellet(pac, pelletArray, turnPellets, myScore, opponentScore);
            }
        }
        // What to do with enemy Pacs
        else {
            let distance = 1000; // find the closest Pellet
            let bestPac = undefined;

            allPacs.filter(pac => pac.mine == true).forEach(myPac => {
                const pacDistance = findPointDistance(myPac.x, myPac.y, pac.x, pac.y);
                if (pacDistance < distance) {
                    distance = pacDistance;
                    bestPac = myPac;
                }
            });

            // If it's too far away, ignore, focus on Pellets
            if (distance > 5) return;
            if (bestPac == undefined) return;

            const command = killCommand(bestPac, pac, distance);
            if (command == undefined) return;

            pacCommands[bestPac.pacId] = command;
        }
    });
       console.error(turnPellets);
    let finalCommand = "";
    // Try to avoid collisions before we send the commands
    avoidCollisions(allPacs, pacCommands, lastPos);

    pacCommands.forEach(command => {
        finalCommand = finalCommand + `${command.action} ${command.id} ${command.params} | `;
    });

    console.log(finalCommand);
}
