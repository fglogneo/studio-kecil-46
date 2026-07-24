const canvas = document.getElementById('videoCanvas');
const ctx = canvas.getContext('2d');
const ratioSelect = document.getElementById('ratioSelect');
const bgInput = document.getElementById('bgInput');
const audioInput = document.getElementById('audioInput');
const textInput = document.getElementById('textInput');
const fontSelect = document.getElementById('fontSelect');
const fontSizeInput = document.getElementById('fontSizeInput');
const visualizerStyle = document.getElementById('visualizerStyle');
const colorSelect = document.getElementById('colorSelect');
const particleEffect = document.getElementById('particleEffect');
const btnPlay = document.getElementById('btnPlay');
const btnExport = document.getElementById('btnExport');

let audioCtx, analyser, source, bufferLength, dataArray;
let audio = new Audio();
let bgImage = null;
let animationFrameId;
let mediaRecorder;
let recordedChunks = [];

// Koordinat Teks Awal (Bisa Di-drag ala CapCut)
let textX = 180;
let textY = 320;
let isDragging = false;

// Array untuk Menampung Efek Partikel Salju
let particles = [];
function initParticles() {
    particles = [];
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 1.5 + 0.5
        });
    }
}

function updateCanvasSize() {
    if (ratioSelect.value === 'portrait') {
        canvas.width = 360; canvas.height = 640;
    } else {
        canvas.width = 640; canvas.height = 360;
    }
    textX = canvas.width / 2;
    textY = canvas.height / 2;
    initParticles();
    drawPreview();
}
ratioSelect.addEventListener('change', updateCanvasSize);

// Fitur Deteksi Seret/Geser Teks menggunakan Mouse atau Sentuhan Jari
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: ((evt.clientX || evt.touches[0].clientX) - rect.left) * scaleX,
        y: ((evt.clientY || evt.touches[0].clientY) - rect.top) * scaleY
    };
}

canvas.addEventListener('mousedown', (e) => { isDragging = true; });
canvas.addEventListener('touchstart', (e) => { isDragging = true; }, {passive: true});

window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('touchend', () => { isDragging = false; });

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const pos = getMousePos(e);
        textX = pos.x; textY = pos.y;
        if (!analyser) drawPreview();
    }
});
canvas.addEventListener('touchmove', (e) => {
    if (isDragging) {
        const pos = getMousePos(e);
        textX = pos.x; textY = pos.y;
        if (!analyser) drawPreview();
    }
}, {passive: true});

bgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            bgImage = new Image();
            bgImage.onload = drawPreview;
            bgImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) audio.src = URL.createObjectURL(file);
});

textInput.addEventListener('input', drawPreview);
fontSelect.addEventListener('change', drawPreview);
fontSizeInput.addEventListener('input', drawPreview);
visualizerStyle.addEventListener('change', drawPreview);
colorSelect.addEventListener('change', drawPreview);
particleEffect.addEventListener('change', drawPreview);

function drawPreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Gambar Latar Belakang
    if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#111116'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Proses Efek Filter Tambahan
    if (particleEffect.value === 'glow') {
        let gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 10, canvas.width/2, canvas.height/2, canvas.height);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (particleEffect.value === 'snow') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        particles.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            if (analyser) {
                p.y += p.speed;
                if (p.y > canvas.height) { p.y = 0; p.x = Math.random() * canvas.width; }
            }
        });
    }

    // 3. Proses Menggambar Bentuk Visualizer Musik
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle = colorSelect.value;
        ctx.strokeStyle = colorSelect.value;
        ctx.lineWidth = 3;

        if (visualizerStyle.value === 'bars') {
            const barWidth = (canvas.width / bufferLength) * 2;
            let barHeight; let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] * (canvas.height / 450);
                ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
                x += barWidth;
            }
        } else if (visualizerStyle.value === 'circle') {
            // Model Lingkaran Bergetar di Tengah ala Musik Jedag-Jedug
            let centerX = canvas.width / 2;
            let centerY = canvas.height / 2;
            let baseRadius = ratioSelect.value === 'portrait' ? 70 : 50;
            ctx.beginPath();
            for (let i = 0; i < bufferLength; i++) {
                let angle = (i / bufferLength) * Math.PI * 2;
                let audioGlow = dataArray[i] * 0.35;
                let r = baseRadius + audioGlow;
                let x = centerX + Math.cos(angle) * r;
                let y = centerY + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath(); ctx.stroke();
        } else if (visualizerStyle.value === 'line') {
            ctx.beginPath();
            let sliceWidth = canvas.width / bufferLength; let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                let v = dataArray[i] / 128.0;
                let y = (v * canvas.height / 3) + (canvas.height * 0.4);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.stroke();
        }
    }

    // 4. Proses Teks Lirik / Kutipan (Bisa Digeser & Ganti Ukuran/Font)
    if (textInput.value) {
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'black'; ctx.shadowBlur = 8;
        ctx.lineWidth = 4; ctx.strokeStyle = '#000000';
        ctx.font = `bold ${fontSizeInput.value}px ${fontSelect.value}`;
        ctx.textAlign = 'center';
        
        const words = textInput.value.split(' ');
        let line = ''; let currentY = textY;
        
        for(let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > canvas.width - 40 && n > 0) {
                ctx.strokeText(line, textX, currentY); ctx.fillText(line, textX, currentY);
                line = words[n] + ' '; currentY += parseInt(fontSizeInput.value) + 6;
            } else { line = testLine; }
        }
        ctx.strokeText(line, textX, currentY); ctx.fillText(line, textX, currentY);
        ctx.shadowBlur = 0;
    }
}

function setupAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser); analyser.connect(audioCtx.destination);
        analyser.fftSize = 64;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }
}

function animate() { drawPreview(); animationFrameId = requestAnimationFrame(animate); }

btnPlay.addEventListener('click', () => {
    if (!audio.src) { alert('Unggah file audio MP3 dahulu!'); return; }
    setupAudioContext();
    if (audio.paused) {
        audio.play(); animate(); btnPlay.innerText = '⏸️ Jeda Studio';
    } else {
        audio.pause(); cancelAnimationFrame(animationFrameId); btnPlay.innerText = '▶️ Mainkan Studio';
    }
});

btnExport.addEventListener('click', () => {
    if (!audio.src) { alert('Unggah file audio dahulu sebelum ekspor!'); return; }
    setupAudioContext(); audio.currentTime = 0; audio.play(); animate();
    recordedChunks = [];
    const canvasStream = canvas.captureStream(30);
    if (audioCtx) {
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest); dest.connect(audioCtx.destination);
        canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
    }
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm;codecs=vp9' });
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = 'video-kreator-reels.mp4'; a.click();
        btnExport.innerText = '📥 Ekspor Video Reels (.mp4)';
    };
    mediaRecorder.start(); btnExport.innerText = '🔴 Mengompilasi Video...';
    audio.onended = () => { mediaRecorder.stop(); cancelAnimationFrame(animationFrameId); };
});

updateCanvasSize();
