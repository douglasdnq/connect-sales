const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const carStats = {
    shelby: { name: 'Shelby Cobra', maxSpeed: 390, acceleration: 8.0, color: '#0066CC' },
    mustang: { name: 'Ford Mustang', maxSpeed: 385, acceleration: 7.8, color: '#CC0000' },
    lamborghini: { name: 'Lamborghini', maxSpeed: 400, acceleration: 8.5, color: '#FFCC00' },
    supra: { name: 'Toyota Supra', maxSpeed: 395, acceleration: 8.2, color: '#FF6600' },
    yaris: { name: 'Toyota Yaris', maxSpeed: 380, acceleration: 7.5, color: '#00CC00' },
    cybertruck: { name: 'Tesla Cybertruck', maxSpeed: 405, acceleration: 9.0, color: '#C0C0C0' },
    byd: { name: 'BYD Song Pro', maxSpeed: 600, acceleration: 12.0, color: '#2E86AB' },
    divo: { name: 'Bugatti Divo', maxSpeed: 650, acceleration: 15.0, color: '#1A1A2E' },
    fusca: { name: 'Volkswagen Fusca', maxSpeed: 140, acceleration: 3.0, color: '#FFE135' },
    harley: { name: 'Harley Davidson', maxSpeed: 370, acceleration: 7.2, color: '#FF4500' },
    golfgti: { name: 'Volkswagen Golf GTI', maxSpeed: 260, acceleration: 6.5, color: '#FF0000' },
    journey: { name: 'Dodge Journey', maxSpeed: 700, acceleration: 16.0, color: '#8B0000' },
    ventonico: { name: 'Super Ventônico', maxSpeed: 1500, acceleration: 25.0, color: '#00FFFF' },
    intergalactico: { name: 'Super Intergalático', maxSpeed: 300000, acceleration: 500.0, color: '#9400D3' },
    compass: { name: 'Jeep Compass', maxSpeed: 498, acceleration: 10.5, color: '#2F4F4F' },
    challenger: { name: 'Dodge Challenger', maxSpeed: 450, acceleration: 9.5, color: '#B22222' },
    trator: { name: 'Trator', maxSpeed: 50, acceleration: 1.5, color: '#228B22' },
    mobi: { name: 'Fiat Mobi', maxSpeed: 200, acceleration: 5.0, color: '#DC143C' },
    nevera: { name: 'Rimac Nevera', maxSpeed: 412, acceleration: 18.0, color: '#4169E1' },
    quadriciclo: { name: 'Quadriciclo', maxSpeed: 120, acceleration: 4.0, color: '#FFA500' },
    ultimate: { name: '@@@@@ ULTIMATE @@@@@', maxSpeed: 999999, acceleration: 9999.0, color: '#FF00FF' }
};

let gameState = 'selection';
let playerCar = null;
let computerCar = null;
let player = null;
let computer = null;
let countdownTimer = 5;
let countdownInterval = null;
let horizon = 0;
let roadCurve = 0;
let targetCurve = 0;

class Car {
    constructor(carType, lane, isPlayer = true) {
        this.stats = carStats[carType];
        this.lane = lane;
        this.trackPosition = 0;
        this.speed = 0;
        this.width = 120;
        this.height = 60;
        this.isPlayer = isPlayer;
        this.finished = false;
        this.finishTime = null;
        this.laps = 0;
        this.x = canvas.width / 2 + (lane * 200);
        this.y = canvas.height - 150;
        this.steer = 0;
        this.rpm = 0;
        this.gear = 1;
    }

    update() {
        if (this.finished || gameState === 'countdown') return;

        if (this.isPlayer) {
            if (keys.ArrowUp || keys.w || keys.W) {
                this.speed = Math.min(this.speed + this.stats.acceleration * 0.6, this.stats.maxSpeed);
            } else if (keys.ArrowDown || keys.s || keys.S) {
                this.speed = Math.max(this.speed - 2, 0);
            } else {
                this.speed = Math.max(this.speed - 0.3, 0);
            }
            
            if (keys.ArrowLeft || keys.a || keys.A) {
                this.steer = Math.max(this.steer - 0.05, -0.3);
                this.lane = Math.max(this.lane - 2, -1);
            } else if (keys.ArrowRight || keys.d || keys.D) {
                this.steer = Math.min(this.steer + 0.05, 0.3);
                this.lane = Math.min(this.lane + 2, 1);
            } else {
                this.steer *= 0.9;
            }
        } else {
            const randomFactor = 0.98 + Math.random() * 0.04;
            this.speed = Math.min(this.speed + this.stats.acceleration * 0.55 * randomFactor, this.stats.maxSpeed);
            
            const targetLane = Math.sin(this.trackPosition * 0.01) * 0.5;
            if (this.lane < targetLane) {
                this.lane += 0.5;
            } else if (this.lane > targetLane) {
                this.lane -= 0.5;
            }
            this.lane = Math.max(-1, Math.min(1, this.lane));
        }

        this.trackPosition += this.speed / 80;
        
        this.rpm = (this.speed / this.stats.maxSpeed) * 8000;
        this.gear = Math.min(6, Math.floor(this.speed / (this.stats.maxSpeed / 6)) + 1);
        
        if (this.trackPosition >= 2400) {
            this.trackPosition -= 2400;
            this.laps++;
            
            if (this.laps >= 3 && !this.finished) {
                this.finished = true;
                this.finishTime = Date.now();
            }
        }
        
        this.x = canvas.width / 2 + (this.lane * 150) - (roadCurve * 100);
    }
}

const keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

function selectCar(carType) {
    playerCar = carType;
    
    const carTypes = Object.keys(carStats);
    let cpuType;
    do {
        cpuType = carTypes[Math.floor(Math.random() * carTypes.length)];
    } while (cpuType === carType);
    
    computerCar = cpuType;
    
    player = new Car(playerCar, 0, true);
    computer = new Car(computerCar, 0.5, false);
    
    document.getElementById('carSelection').style.display = 'none';
    gameState = 'countdown';
    countdownTimer = 5;
    startCountdown();
}

function startCountdown() {
    countdownInterval = setInterval(() => {
        countdownTimer--;
        if (countdownTimer <= 0) {
            clearInterval(countdownInterval);
            gameState = 'racing';
            gameLoop();
        }
    }, 1000);
    gameLoop();
}

function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#B8E3FF');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
}

function drawRoad() {
    const roadY = canvas.height / 2;
    const roadHeight = canvas.height / 2;
    const vanishX = canvas.width / 2 + roadCurve * 200;
    
    // Asfalto
    ctx.fillStyle = '#3A3A3A';
    ctx.fillRect(0, roadY, canvas.width, roadHeight);
    
    // Grama esquerda
    ctx.fillStyle = '#2D7A2D';
    ctx.beginPath();
    ctx.moveTo(0, roadY);
    ctx.lineTo(vanishX - 300, roadY);
    ctx.lineTo(50, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    // Grama direita
    ctx.beginPath();
    ctx.moveTo(canvas.width, roadY);
    ctx.lineTo(vanishX + 300, roadY);
    ctx.lineTo(canvas.width - 50, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    drawRoadLines();
}

function drawCockpit() {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, canvas.height - 200, canvas.width, 200);
    
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(100, canvas.height - 180, canvas.width - 200, 180);
    
    const dashboardGradient = ctx.createLinearGradient(0, canvas.height - 150, 0, canvas.height);
    dashboardGradient.addColorStop(0, '#3a3a3a');
    dashboardGradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = dashboardGradient;
    ctx.fillRect(150, canvas.height - 150, canvas.width - 300, 150);
    
    drawSpeedometer(300, canvas.height - 100);
    drawTachometer(canvas.width - 300, canvas.height - 100);
    
    drawSteeringWheel(canvas.width / 2, canvas.height - 50);
    
    ctx.fillStyle = player.stats.color;
    ctx.fillRect(0, canvas.height - 5, canvas.width, 5);
}

function drawSpeedometer(x, y) {
    const speed = Math.round(player.speed);
    const maxSpeed = player.stats.maxSpeed;
    const angle = (speed / maxSpeed) * 1.5 * Math.PI + 0.75 * Math.PI;
    
    ctx.save();
    ctx.translate(x, y);
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.stroke();
    
    for (let i = 0; i <= 10; i++) {
        const a = 0.75 * Math.PI + (i / 10) * 1.5 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
        ctx.lineTo(Math.cos(a) * 70, Math.sin(a) * 70);
        ctx.stroke();
    }
    
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * 55, Math.sin(angle) * 55);
    ctx.stroke();
    
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(speed, 0, 40);
    ctx.font = '12px Arial';
    ctx.fillText('km/h', 0, 55);
    
    ctx.restore();
}

function drawTachometer(x, y) {
    const rpm = player.rpm;
    const angle = (rpm / 8000) * 1.5 * Math.PI + 0.75 * Math.PI;
    
    ctx.save();
    ctx.translate(x, y);
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.stroke();
    
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 1.75 * Math.PI, 2.25 * Math.PI);
    ctx.stroke();
    
    for (let i = 0; i <= 8; i++) {
        const a = 0.75 * Math.PI + (i / 8) * 1.5 * Math.PI;
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
        ctx.lineTo(Math.cos(a) * 70, Math.sin(a) * 70);
        ctx.stroke();
        
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(i, Math.cos(a) * 45, Math.sin(a) * 45 + 3);
    }
    
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * 55, Math.sin(angle) * 55);
    ctx.stroke();
    
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(rpm), 0, 40);
    ctx.font = '12px Arial';
    ctx.fillText('RPM x1000', 0, 55);
    
    ctx.font = '24px Arial';
    ctx.fillText(player.gear, 0, -35);
    
    ctx.restore();
}

function drawSteeringWheel(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.steer);
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(60, 0);
    ctx.stroke();
    
    ctx.fillStyle = player.stats.color;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
}

function drawOpponentCar() {
    if (!computer || computer.finished) return;
    
    const relativePos = computer.trackPosition - player.trackPosition;
    const distance = Math.abs(relativePos);
    
    if (distance < 200) {
        const scale = Math.max(0.3, 1 - distance / 200);
        const y = canvas.height / 2 + 50 + (distance * 2);
        const x = canvas.width / 2 + (computer.lane - player.lane) * 200 * scale;
        
        if (relativePos > 0) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            
            ctx.fillStyle = computer.stats.color;
            ctx.fillRect(-60, -30, 120, 60);
            
            ctx.fillStyle = '#000';
            ctx.fillRect(-50, -25, 30, 50);
            ctx.fillRect(20, -25, 30, 50);
            
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(-60, 20, 20, 10);
            ctx.fillRect(40, 20, 20, 10);
            
            ctx.restore();
        }
    }
}

function drawUI() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 80);
    
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(player.stats.name, 20, 35);
    ctx.fillText(`Volta: ${player.laps + 1}/3`, 20, 55);
    ctx.fillText(`Posição: ${player.trackPosition > computer.trackPosition ? '1º' : '2º'}`, 20, 75);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvas.width - 210, 10, 200, 80);
    
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'right';
    ctx.fillText(computer.stats.name, canvas.width - 20, 35);
    ctx.fillText(`Volta: ${computer.laps + 1}/3`, canvas.width - 20, 55);
    ctx.fillText(`Posição: ${computer.trackPosition > player.trackPosition ? '1º' : '2º'}`, canvas.width - 20, 75);
}

function drawCountdown() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (countdownTimer > 0) {
        ctx.fillText(countdownTimer, canvas.width/2, canvas.height/2);
    } else {
        ctx.fillStyle = '#0F0';
        ctx.fillText('VAI!', canvas.width/2, canvas.height/2);
    }
}

function checkGameOver() {
    if (player.finished || computer.finished) {
        gameState = 'gameover';
        const gameOverDiv = document.getElementById('gameOver');
        const gameOverText = document.getElementById('gameOverText');
        
        if (player.finished && computer.finished) {
            gameOverText.textContent = player.finishTime < computer.finishTime ? 'Você venceu a corrida!' : 'O computador venceu a corrida!';
        } else if (player.finished) {
            gameOverText.textContent = 'Você venceu a corrida!';
        } else {
            gameOverText.textContent = 'O computador venceu a corrida!';
        }
        
        gameOverDiv.style.display = 'block';
    }
}

function resetGame() {
    gameState = 'selection';
    playerCar = null;
    computerCar = null;
    player = null;
    computer = null;
    horizon = 0;
    roadCurve = 0;
    targetCurve = 0;
    document.getElementById('carSelection').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}


function drawRoadLines() {
    const roadY = canvas.height / 2;
    const vanishX = canvas.width / 2 + roadCurve * 200;
    const roadWidth = 600;
    
    // Linhas laterais brancas
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(vanishX - roadWidth/2, roadY);
    ctx.lineTo(50, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(vanishX + roadWidth/2, roadY);
    ctx.lineTo(canvas.width - 50, canvas.height);
    ctx.stroke();
    
    // Linha central amarela tracejada
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.setLineDash([30, 15]);
    ctx.beginPath();
    ctx.moveTo(vanishX, roadY);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Marcações laterais
    for (let i = 0; i < 20; i++) {
        const progress = (horizon / 10 + i) % 2;
        if (progress < 1) {
            const y = roadY + (canvas.height - roadY) * (i / 20);
            const perspective = i / 20;
            const width = 80 * (1 - perspective * 0.7);
            
            ctx.fillStyle = '#FFFFFF';
            // Esquerda
            const leftX = vanishX - roadWidth/2 + (50 - vanishX + roadWidth/2) * perspective;
            ctx.fillRect(leftX - width, y - 3, width, 6);
            
            // Direita  
            const rightX = vanishX + roadWidth/2 + (canvas.width - 50 - vanishX - roadWidth/2) * perspective;
            ctx.fillRect(rightX, y - 3, width, 6);
        }
    }
}


function gameLoop() {
    if (gameState === 'selection') return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawSky();
    drawRoad();
    drawOpponentCar();
    drawCockpit();
    drawUI();
    
    if (gameState === 'countdown') {
        drawCountdown();
    } else if (gameState === 'racing') {
        player.update();
        computer.update();
        
        horizon += player.speed / 50;
        targetCurve = Math.sin(player.trackPosition * 0.02) * 0.5;
        roadCurve += (targetCurve - roadCurve) * 0.05;
        
        checkGameOver();
    }
    
    requestAnimationFrame(gameLoop);
}