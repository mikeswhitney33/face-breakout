const canvas = document.querySelector("canvas");
const video = document.querySelector("video");
const faceBtn = document.querySelector("#face-btn");
const ctx = canvas.getContext("2d");
const infoSpan = document.querySelector("#info");
let faceController = false;
let cap, img, smallImg, gray, faces, classifier;
const states = {
    standby: "standby",
    play: "play"
};

function matchVideoDims() {
    video.width = canvas.width;
    video.height = canvas.height;
    console.log(img);
    if(img !== undefined) {
        cv.resize(img, img, video.height, video.width);
        console.log(`${img.width}, ${img.height}`);
    }
}

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
        this.score = 0;
        this.lives = 3;
        this.highScore = localStorage.getItem("highScore");
        if(this.highScore === null) {
            this.highScore = 0;
        }
        else {
            this.highScore = parseInt(this.highScore);
        }


        this.playRect = {
            left: 50,
            right: canvas.width - 50,
            top: 0,
            bottom: canvas.height,
        };

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
        this.bricks = [];
        for(let x = this.playRect.left;x < this.playRect.right; x += this.brickWidth) {
            for(let row = this.playRect.top;row < this.brickColors.length;row++) {
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

    updatePaddlePos(x) {
        this.paddle.min.x = x - this.brickWidth / 2;
        this.paddle.max.x = x + this.brickWidth / 2;
    }

    update(deltaTime) {
        if(faceController) {
            if(img !== undefined) {
                cap.read(img);
                cv.flip(img, img, 1);
                cv.resize(img, smallImg, new cv.Size(), 1 / 4, 1 / 4, cv.INTER_AREA);
                cv.cvtColor(smallImg, gray, cv.COLOR_RGBA2GRAY, 0);
                try {
                    classifier.detectMultiScale(gray, faces, 1.1, 3, 0);
                    if (faces.size() >= 1) {
                        const face = faces.get(0);
                        const x = face.x + face.width / 2;
                        this.updatePaddlePos(4 * x);
                    }
                }
                catch(err) {
                    console.error(err);
                }

            }
        }
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
                this.score++;
                if(this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem("highScore", `${this.highScore}`);
                }
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
            else if(nextPos.x + this.ballRadius > this.playRect.right || nextPos.x - this.ballRadius < this.playRect.left) {
                this.ballDir.x *= -1;
            }
            else if(nextPos.y - this.ballRadius < 0) {
                this.ballDir.y *= -1;
            }
            else if(nextPos.y + this.ballRadius > canvas.height) {
                this.state = states.standby;
                this.lives--;
                if(this.lives < 0) {
                    this.lives = 3;
                    this.score = 0;
                    this.initBricks();
                }
            }
            this.ballPos.x = this.ballPos.x + this.ballDir.x * nextT;
            this.ballPos.y = this.ballPos.y + this.ballDir.y * nextT;
        }
        else {
            alert(`invalid state: ${this.state}`)
        }
    }

    draw() {
        // ctx.clearRect(0, 0, canvas.width, canvas.height);
        if(faceController) {
            if(img !== undefined) {
                // cap.read(img);
                // cv.flip(img, img, 1);
                cv.imshow(canvas, img);
            }
        }
        else {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, this.playRect.left, canvas.height);
        ctx.fillRect(this.playRect.right, 0, canvas.width - this.playRect.right, canvas.height);
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

        if(this.state === states.standby) {
            ctx.fillStyle = "black";
            ctx.fillRect(this.playRect.left, canvas.height / 2 - 50, this.playRect.right - this.playRect.left, 50);
            ctx.fillStyle = "white"
            ctx.textAlign = "center";
            ctx.font = "48px Arial";
            ctx.textBaseline = "bottom";
            ctx.fillText("Click To Start", canvas.width / 2, canvas.height/2);
        }

        infoSpan.innerHTML = `Lives: ${this.lives}  Score: ${this.score}  High Score: ${this.highScore}`;
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

function rerange(value, oldLow, oldHi, newLow, newHi) {
    return (((value - oldLow) * (newHi - newLow)) / (oldHi - oldMin)) + newLow;
}

function main() {
    const utils = new Utils("errorMessage");
    cv['onRuntimeInitialized'] = () => {
        matchVideoDims();
        cap = new cv.VideoCapture(video);
        img = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        smallImg = new cv.Mat();
        gray = new cv.Mat();
        faces = new cv.RectVector();
        classifier = new cv.CascadeClassifier();
        const faceFile = "haarcascade_frontalface_default.xml";
        utils.createFileFromUrl(faceFile, faceFile, () => {
            classifier.load(faceFile);
            faceBtn.removeAttribute("disabled");
            faceBtn.addEventListener("click", () => {
                if (!faceController) {
                    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                        .then(function (stream) {
                            video.srcObject = stream;
                            video.play();
                            faceController = true;
                            faceBtn.textContent = "Use Mouse Controller";
                        })
                        .catch(function (err) {
                            console.log("An error occurred! " + err);
                        });
                } else {
                    video.pause();
                    video.srcObject.getTracks()[0].stop();
                    video.src = "";
                    faceController = false;
                    faceBtn.textContent = "Use Face Controller";
                }
            });
        });
    }
    const game = new Breakout();
    canvas.addEventListener("mousemove", (event) => {
        if(!faceController) {
            const rect = canvas.getBoundingClientRect();
            const rectWidth = rect.right - rect.left;
            const ratioWidth = rectWidth / canvas.width;
            const x = (event.clientX - rect.left) / ratioWidth;

            game.paddle.min.x = x - game.brickWidth / 2;
            game.paddle.max.x = x + game.brickWidth / 2;
        }
    });
    canvas.addEventListener("click", () => {
        game.startPlayState();
    });
    canvas.addEventListener("resize", matchVideoDims);
    game.mainloop();
}

window.onload = main;