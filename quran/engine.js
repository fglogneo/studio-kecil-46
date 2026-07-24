// Mengambil daftar surah saat halaman dibuka
window.onload = function() {
    fetch('https://equran.id')
        .then(res => res.json())
        .then(data => {
            let select = document.getElementById('surahSelect');
            select.innerHTML = '';
            data.data.forEach(surah => {
                let opt = document.createElement('option');
                opt.value = surah.nomor;
                opt.text = `${surah.nomor}. ${surah.namaLatin} (${surah.jumlahAyat} Ayat)`;
                select.add(opt);
            });
        }).catch(err => alert('Gagal memuat daftar surah. Periksa koneksi internet.'));
};

// Fungsi utama mencari data ayat beserta murottal dan terjemahan inggris
function cariAyat() {
    let surahNum = document.getElementById('surahSelect').value;
    let ayatNum = document.getElementById('ayatInput').value;

    if(!ayatNum) return alert('Masukkan nomor ayat!');

    // Ambil data Arab & Indonesia dari API e-Quran ID
    fetch(`https://equran.id/${surahNum}`)
        .then(res => res.json())
        .then(resData => {
            let surah = resData.data;
            let ayatData = surah.ayat.find(a => a.nomorAyat == ayatNum);
            
            if(!ayatData) return alert(`Ayat ${ayatNum} tidak ditemukan di Surah ${surah.namaLatin}!`);

            document.getElementById('txtArab').innerText = ayatData.teksArab;
            document.getElementById('txtIndo').innerText = `🇮🇩 " ${ayatData.teksIndonesia} "`;
            document.getElementById('txtMeta').innerText = `— QS. ${surah.namaLatin} [${surahNum}]: ${ayatNum}`;
            
            document.getElementById('murottalAudio').src = ayatData.audio['01']; 

            return fetch(`https://alquran.cloud{surahNum}:${ayatNum}/en.sahih`);
        })
        .then(resEn => resEn.json())
        .then(enData => {
            if(enData && enData.data) {
                document.getElementById('txtInggris').innerText = `🇬🇧 " ${enData.data.text} "`;
            }
            document.getElementById('resultArea').style.display = 'block';
        })
        .catch(err => {
            console.log(err);
            alert('Terjadi kesalahan saat mengambil data.');
        });
}

// Fungsi Copy otomatis ke clipboard dengan sistem aman & fallback
function copyText(type) {
    let text = "";
    let arab = document.getElementById('txtArab').innerText;
    let id = document.getElementById('txtIndo').innerText;
    let en = document.getElementById('txtInggris').innerText;
    let meta = document.getElementById('txtMeta').innerText;

    if (type === 'arab') text = arab;
    else if (type === 'indo') text = id;
    else if (type === 'en') text = en;
    else if (type === 'all') {
        text = `${arab}\n\n${id}\n\n${en}\n\n${meta}\n\n#quran #remindermuslim #contentcreator`;
    }

    if (!text.trim()) {
        alert('Gagal menyalin: Tidak ada teks yang tersedia.');
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => {
                alert('Teks berhasil disalin! Siap ditempel di CapCut/Premiere/Caption Sosmed. ✨');
            })
            .catch(err => {
                console.error('Gagal menyalin dengan Clipboard API: ', err);
                fallbackCopyText(text);
            });
    } else {
        fallbackCopyText(text);
    }
}

function fallbackCopyText(text) {
    let textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        let successful = document.execCommand('copy');
        if (successful) {
            alert('Teks berhasil disalin (metode cadangan)! Siap ditempel di CapCut/Premiere/Caption Sosmed. ✨');
        } else {
            alert('Gagal menyalin teks. Silakan salin secara manual.');
        }
    } catch (err) {
        alert('Browser Anda memblokir fitur salin otomatis. Silakan salin manual.');
    }

    document.body.removeChild(textArea);
}
