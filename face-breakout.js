const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const states = {
    standby: "standby",
    play: "play"
};

function ballBoxInterection(pos, rad, box) {
    return pos.x + rad > box.min.x && pos.x - rad < box.max.x && pos.y + rad > box.min.y && pos.y - rad < box.max.y;
}

function normalize(vec) {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    return {x: vec.x / len, y: vec.y / len};
}

class Breakout {
    constructor() {
        this.state = states.standby;
        this.prevTime;

        this.brickWidth = canvas.width / 10;
        this.brickHeight = 10;
        this.bricks = []
        this.brickColors = ["red", "green", "blue", "cyan", "magenta", "yellow"];
        this.initBricks();

        this.paddlePos = {
            x: canvas.width / 2 - this.brickWidth / 2,
            y: canvas.height - this.brickHeight * 2
        }
        this.paddle = {
            color: "white",
            min: {
                x: canvas.width / 2 - this.brickWidth / 2,
                y: canvas.height - this.brickHeight * 2
            },
        }
        this.paddle.max = {
            x: this.paddle.min.x + this.brickWidth,
            y: this.paddle.min.y + this.brickHeight
        }

        this.ballSpeed = 100;
        this.ballRadius = 5;
        this.ballPos = {
            x: this.paddlePos.x,
            y: this.paddlePos.y - this.brickHeight/2 - this.ballRadius + 1
        };
        this.ballDir = { x: 0, y: -1 };
    }

    initBricks() {
        for(let x = 0;x < canvas.width; x += this.brickWidth) {
            for(let row = 0;row < this.brickColors.length;row++) {
                const y = row * this.brickHeight;
                this.bricks.push({
                    min: {x: x, y: y},
                    max: {x: x+this.brickWidth, y: y+this.brickHeight},
                    color: this.brickColors[row]
                });
            }
        }
    }

    startPlayState() {
        if(this.state === states.standby) {
            this.state = states.play;
            this.ballDir = {x: 0, y: -1};
        }
    }

    update(deltaTime) {
        if(this.state === states.standby) {
            this.ballPos = {
                x: (this.paddle.min.x + this.paddle.max.x) / 2,
                y: this.paddle.min.y - this.ballRadius
            };
        }
        else if(this.state === states.play) {
            const nextT = this.ballSpeed * deltaTime;
            const nextPos = {
                x: this.ballPos.x + this.ballDir.x * nextT,
                y: this.ballPos.y + this.ballDir.y * nextT
            }
            let hit = false;
            let i = 0;
            for(const brick of this.bricks) {
                if(ballBoxInterection(nextPos, this.ballRadius, brick)) {
                    hit = true;
                    break;
                };
                i++;
            }
            if(hit) {
                const hitBrick = this.bricks[i];
                if(this.ballPos.x < hitBrick.min.x || this.ballPos.x > hitBrick.max.x) {
                    this.ballDir.x *= -1;
                }
                if(this.ballPos.y < hitBrick.min.y || this.ballPos.y > hitBrick.max.y) {
                    this.ballDir.y *= -1;
                }
                this.bricks.splice(i, 1);
            }
            else if(ballBoxInterection(nextPos, this.ballRadius, this.paddle)) {
                const step = this.brickWidth / 5;
                const first = this.paddle.min.x + step;
                const second = first + step;
                const third = second + step;
                const fourth = third + step;
                if(this.ballPos.x < first) {
                    this.ballDir = {x: -1, y: -1};
                }
                else if(this.ballPos.x < second) {
                    this.ballDir = {x: -1, y: -this.ballDir.y};
                }
                else if(this.ballPos.x < third) {
                    this.ballDir = {x: 0, y: -1}
                }
                else if(this.ballDir.x < fourth) {
                    this.ballDir = {x: 1, y: -this.ballDir.y}
                }
                else {
                    this.ballDir = {x: 1, y: -1};
                }
            }
            else if(nextPos.x + this.ballRadius > canvas.width || nextPos.x - this.ballRadius < 0) {
                this.ballDir.x *= -1;
            }
            else if(nextPos.y - this.ballRadius < 0) {
                this.ballDir.y *= -1;
            }
            else if(nextPos.y + this.ballRadius > canvas.height) {
                this.state = states.standby;
            }
            this.ballPos.x = this.ballPos.x + this.ballDir.x * nextT;
            this.ballPos.y = this.ballPos.y + this.ballDir.y * nextT;

        }
        else {
            alert(`invalid state: ${this.state}`)
        }
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";

        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for(const brick of this.bricks) {
            ctx.fillStyle = brick.color;
            ctx.fillRect(
                brick.min.x,
                brick.min.y,
                brick.max.x-brick.min.x,
                brick.max.y-brick.min.y,
            );
        }

        ctx.fillStyle = "white";
        ctx.fillRect(
            this.paddle.min.x,
            this.paddle.min.y,
            this.paddle.max.x - this.paddle.min.x,
            this.paddle.max.y - this.paddle.min.y,
        );

        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(this.ballPos.x, this.ballPos.y, this.ballRadius, 0, 360);
        ctx.fill();
    }

    mainloop() {
        const self = this;
        function render(timestamp) {
            if(self.prevTime === undefined) {
                self.prevTime = timestamp;
            }
            const deltaTime = (timestamp - self.prevTime) / 1000;
            self.update(deltaTime);
            self.draw();
            self.prevTime = timestamp;
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }
}

function main() {
    const game = new Breakout();
    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        game.paddle.min.x = x - game.brickWidth / 2;
        game.paddle.max.x = x + game.brickWidth / 2;
    });
    canvas.addEventListener("click", () => {
        game.startPlayState();
    });
    game.mainloop();
}

window.onload = main;