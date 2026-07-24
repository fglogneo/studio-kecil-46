// Mengambil elemen-elemen dari HTML
const canvas = document.getElementById('videoCanvas');
const ctx = canvas.getContext('2d');
const ratioSelect = document.getElementById('ratioSelect');
const bgInput = document.getElementById('bgInput');
const audioInput = document.getElementById('audioInput');
const textInput = document.getElementById('textInput');
const colorSelect = document.getElementById('colorSelect');
const btnPlay = document.getElementById('btnPlay');
const btnExport = document.getElementById('btnExport');

// Variabel audio dan animasi
let audioCtx, analyser, source, bufferLength, dataArray;
let audio = new Audio();
let bgImage = null;
let animationFrameId;
let mediaRecorder;
let recordedChunks = [];

// 1. Logika Mengubah Ukuran Rasio Layar (Portrait / Landscape)
function updateCanvasSize() {
    if (ratioSelect.value === 'portrait') {
        canvas.width = 360;
        canvas.height = 640; // Rasio 9:16 untuk Reels
    } else {
        canvas.width = 640;
        canvas.height = 360; // Rasio 16:9 untuk YouTube
    }
    drawPreview();
}
ratioSelect.addEventListener('change', updateCanvasSize);

// 2. Logika Membaca Gambar Latar Belakang yang Diunggah
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

// 3. Logika Membaca File Audio Musik
audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        audio.src = URL.createObjectURL(file);
    }
});

// Menggambar ulang layar saat teks diketik
textInput.addEventListener('input', drawPreview);

// 4. Fungsi Utama Menggambar Semua Elemen ke Layar Preview
function drawPreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Menggambar Gambar Latar Belakang (jika ada)
    if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Menggambar Gelombang Visualizer Musik (jika musik diputar)
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle = colorSelect.value;
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * (canvas.height / 500);
            // Menggambar grafik balok di bagian bawah video
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
            x += barWidth;
        }
    }

    // Menggambar Teks Kutipan Ayat / Lirik di Tengah Video
    if (textInput.value) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 4;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        
        // Memecah teks otomatis jika terlalu panjang agar tidak keluar layar
        const words = textInput.value.split(' ');
        let line = '';
        let y = canvas.height / 2;
        
        for(let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > canvas.width - 40 && n > 0) {
                ctx.strokeText(line, canvas.width / 2, y);
                ctx.fillText(line, canvas.width / 2, y);
                line = words[n] + ' ';
                y += 26;
            } else {
                line = testLine;
            }
        }
        ctx.strokeText(line, canvas.width / 2, y);
        ctx.fillText(line, canvas.width / 2, y);
        ctx.shadowBlur = 0; // reset shadow
    }
}

// 5. Menghidupkan Analis Frekuensi Suara (Audio Context)
function setupAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 128; // Jumlah batang gelombang
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }
}

// Loop Animasi untuk memperbarui gerakan gelombang secara real-time
function animate() {
    drawPreview();
    animationFrameId = requestAnimationFrame(animate);
}

// Tombol Mainkan Musik
btnPlay.addEventListener('click', () => {
    if (!audio.src) {
        alert('Silakan unggah file audio MP3 terlebih dahulu!');
        return;
    }
    setupAudioContext();
    if (audio.paused) {
        audio.play();
        animate();
        btnPlay.innerText = '⏸️ Jeda Musik';
    } else {
        audio.pause();
        cancelAnimationFrame(animationFrameId);
        btnPlay.innerText = '▶️ Putar Musik & Animasi';
    }
});

// 6. Logika Ekspor Menjadi Video MP4
btnExport.addEventListener('click', () => {
    if (!audio.src) {
        alert('Silakan unggah audio dan mainkan sebelum mengekspor!');
        return;
    }
    
    setupAudioContext();
    audio.currentTime = 0;
    audio.play();
    animate();
    
    recordedChunks = [];
    // Mengambil rekaman dari Canvas gambar dengan kecepatan 30 FPS
    const canvasStream = canvas.captureStream(30);
    
    // Memasukkan jalur audio musik ke dalam rekaman video
    if (audioCtx) {
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        dest.connect(audioCtx.destination);
        const audioTrack = dest.stream.getAudioTracks()[0];
        canvasStream.addTrack(audioTrack);
    }

    // Mulai merekam
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm;codecs=vp9' });
    
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        // Mengubah hasil rekaman menjadi file video .mp4 / .webm yang bisa diunduh
        const blob = new Blob(recordedChunks, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reels-konten-kreator.mp4';
        a.click();
        btnExport.innerText = '📥 Ekspor Jadi Video (.mp4)';
    };

    mediaRecorder.start();
    btnExport.innerText = '🔴 Sedang Merekam... (Tunggu Musik Selesai)';
    
    // Perekaman otomatis berhenti jika lagu habis
    audio.onended = () => {
        mediaRecorder.stop();
        cancelAnimationFrame(animationFrameId);
    };
});

// Jalankan ukuran canvas default saat pertama kali dimuat
updateCanvasSize();
