// ===== KONFIGURASI API =====
// API Key untuk OpenRouter AI
const API_KEY = "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";
// URL endpoint untuk API chat
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ===== ELEMEN DOM =====
// Mendapatkan referensi ke semua elemen DOM yang dibutuhkan
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotContainer = document.getElementById('chatbotContainer');
const closeBtn = document.getElementById('closeBtn');
const resizeBtn = document.getElementById('resizeBtn');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');
const voiceTypeBtn = document.getElementById('voiceTypeBtn'); // Tombol ganti jenis suara
const voiceInputBtn = document.getElementById('voiceInputBtn');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const voiceStatusText = document.getElementById('voiceStatusText');
const voiceTypeText = document.getElementById('voiceTypeText');
const voiceTypeIcon = document.getElementById('voiceTypeIcon');

// ===== STATE CHATBOT =====
// Variabel untuk menyimpan state chatbot
let isChatbotOpen = false; // Status chatbot terbuka/tutup
let isExpanded = false; // Status chat diperbesar
let isVoiceEnabled = true; // Status suara AI aktif/tidak
let isListening = false; // Status sedang mendengarkan suara
let recognition = null; // Objek speech recognition
let speechSynthesis = window.speechSynthesis; // Objek text-to-speech
let currentUtterance = null; // Utterance yang sedang diproses
let userInteracted = false; // Status user sudah berinteraksi
let useFemaleVoice = false; // VARIABLE UNTUK MENGATUR SUARA: false = laki-laki, true = perempuan
let indonesianVoices = []; // Daftar voice bahasa Indonesia yang tersedia
let maleVoice = null; // Voice untuk laki-laki
let femaleVoice = null; // Voice untuk perempuan

// ===== KONTEKS SISTEM UNTUK AI =====
// Prompt sistem untuk mengatur perilaku AI
const SYSTEM_CONTEXT = `Kamu adalah asisten virtual untuk portfolio fotografi bernama "Mr. Great" yang dimiliki oleh fotografer Darrell. 
Darrell adalah fotografer profesional dengan lebih dari 10 tahun pengalaman, berbasis di Indonesia.
Layanan yang ditawarkan: fotografi portrait, event, commercial, travel/landscape, dan editing foto.

INSTRUKSI PENTING:
1. Gunakan format teks biasa, TIDAK gunakan markdown seperti **bold**, *italic*, # heading, atau format lainnya
2. Gunakan paragraf yang jelas dan mudah dibaca
3. Batasi respon maksimal 3-4 paragraf pendek atau 150-200 kata
4. Gunakan poin-poin dengan bullet biasa (•) bukan format list markdown
5. Selalu gunakan bahasa Indonesia yang natural dan ramah
6. Jangan gunakan emoji atau simbol tidak perlu
7. Fokus pada informasi yang relevan dan to the point

INFORMASI MR. GREAT:
• Nama: Mr. Great Photography
• Fotografer: Darrell
• Pengalaman: 10+ tahun
• Lokasi: Indonesia
• Layanan: Portrait, Event, Commercial, Travel/Landscape, Photo Editing
• Filosofi: Menangkap momen dengan sentuhan artistik dan profesional
• Kontak: +62 812 3456 7890
• Slogan: "Menangkap momen terbaik dalam hidup Anda"

TUGAS KAMU:
1. Jawab pertanyaan tentang layanan fotografi dengan jelas dan singkat
2. Berikan informasi penting tanpa bertele-tele
3. Bantu calon klien memahami proses kerja dengan sederhana
4. Sarankan layanan yang sesuai berdasarkan kebutuhan mereka
5. Jawab pertanyaan umum tentang fotografi secara ringkas
6. Jika pertanyaan terlalu kompleks, arahkan untuk kontak langsung

GAYA KOMUNIKASI: Ramah, profesional, informatif, dan to the point.
Gunakan bahasa Indonesia yang sopan dan mudah dipahami.
Jika tidak tahu jawabannya, akui dengan jujur dan tawarkan alternatif.
JANGAN gunakan format markdown apapun, hanya teks biasa.`;

// ===== FUNGSI UNTUK MENCATAT INTERAKSI USER =====
// Menandai bahwa user sudah berinteraksi dengan halaman
// Ini diperlukan karena browser memblokir TTS sebelum user berinteraksi
function markUserInteraction() {
    if (!userInteracted) {
        userInteracted = true;
        console.log('Interaksi user terdeteksi - TTS sekarang bisa berfungsi');
    }
}

// ===== FUNGSI UNTUK MENGUBAH JENIS SUARA =====
// Fungsi untuk mengubah antara suara laki-laki dan perempuan
function changeVoiceType() {
    useFemaleVoice = !useFemaleVoice; // Toggle antara true/false
    
    // Update UI untuk menunjukkan jenis suara saat ini
    updateVoiceTypeUI();
    
    // Hentikan suara yang sedang diputar jika ada
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    // Coba suara baru dengan pesan contoh
    if (isVoiceEnabled && userInteracted) {
        setTimeout(() => {
            const testMessage = useFemaleVoice ? 
                "Ini adalah suara perempuan." : 
                "Ini adalah suara laki-laki.";
            speakText(testMessage);
        }, 300);
    }
}

// ===== FUNGSI UNTUK UPDATE UI JENIS SUARA =====
// Fungsi terpisah untuk mengupdate UI jenis suara
function updateVoiceTypeUI() {
    if (useFemaleVoice) {
        // Mode suara perempuan
        voiceTypeBtn.innerHTML = '<i class="fas fa-female"></i>';
        voiceTypeBtn.classList.add('active-female');
        voiceTypeBtn.title = 'Ganti ke suara laki-laki';
        voiceTypeText.textContent = 'Suara: Perempuan';
        voiceTypeIcon.className = 'fas fa-female';
        showNotification('Suara AI diubah ke perempuan');
        console.log('Suara diubah ke perempuan');
    } else {
        // Mode suara laki-laki
        voiceTypeBtn.innerHTML = '<i class="fas fa-male"></i>';
        voiceTypeBtn.classList.remove('active-female');
        voiceTypeBtn.title = 'Ganti ke suara perempuan';
        voiceTypeText.textContent = 'Suara: Laki-laki';
        voiceTypeIcon.className = 'fas fa-male';
        showNotification('Suara AI diubah ke laki-laki');
        console.log('Suara diubah ke laki-laki');
    }
}

// ===== CARI DAN PILIH VOICE BAHASA INDONESIA =====
// Fungsi untuk mencari dan memilih voice bahasa Indonesia yang terbaik
function findAndSelectIndonesianVoices() {
    const allVoices = speechSynthesis.getVoices();
    indonesianVoices = [];
    maleVoice = null;
    femaleVoice = null;
    
    // Cari semua voice yang mendukung bahasa Indonesia
    allVoices.forEach(voice => {
        // Cek jika voice mendukung bahasa Indonesia (id-ID atau id-*)
        if (voice.lang === 'id-ID' || voice.lang.startsWith('id-')) {
            indonesianVoices.push(voice);
        }
    });
    
    console.log(`Ditemukan ${indonesianVoices.length} voice bahasa Indonesia`);
    
    // Jika ada voice Indonesia, coba klasifikasikan
    if (indonesianVoices.length > 0) {
        // Coba cari voice berdasarkan nama
        indonesianVoices.forEach(voice => {
            const voiceName = voice.name.toLowerCase();
            
            // Cari voice perempuan
            if (voiceName.includes('female') || 
                voiceName.includes('perempuan') || 
                voiceName.includes('wanita') ||
                voiceName.includes('female')) {
                femaleVoice = voice;
                console.log('Voice perempuan ditemukan:', voice.name);
            }
            // Cari voice laki-laki
            else if (voiceName.includes('male') || 
                     voiceName.includes('laki') || 
                     voiceName.includes('pria') ||
                     voiceName.includes('male')) {
                maleVoice = voice;
                console.log('Voice laki-laki ditemukan:', voice.name);
            }
        });
        
        // Jika tidak ditemukan berdasarkan nama, gunakan heuristik
        if (!maleVoice && !femaleVoice && indonesianVoices.length >= 2) {
            // Asumsi: voice pertama untuk laki-laki, kedua untuk perempuan
            maleVoice = indonesianVoices[0];
            femaleVoice = indonesianVoices[1] || indonesianVoices[0];
            console.log('Menggunakan heuristik: voice[0] untuk laki-laki, voice[1] untuk perempuan');
        } else if (!maleVoice && indonesianVoices.length > 0) {
            // Default ke voice pertama untuk laki-laki
            maleVoice = indonesianVoices[0];
            console.log('Default ke voice pertama untuk laki-laki:', maleVoice.name);
        }
        
        if (!femaleVoice && indonesianVoices.length > 1) {
            // Default ke voice kedua untuk perempuan
            femaleVoice = indonesianVoices[1] || indonesianVoices[0];
            console.log('Default ke voice alternatif untuk perempuan:', femaleVoice.name);
        }
    } else if (allVoices.length > 0) {
        // Jika tidak ada voice Indonesia, gunakan voice default
        console.log('Tidak ditemukan voice bahasa Indonesia, menggunakan voice default');
        indonesianVoices = allVoices;
        
        // Coba klasifikasikan voice default
        allVoices.forEach(voice => {
            const voiceName = voice.name.toLowerCase();
            
            // Cari voice perempuan
            if (voiceName.includes('female') || voiceName.includes('woman') || voiceName.includes('girl')) {
                femaleVoice = voice;
                console.log('Voice perempuan default ditemukan:', voice.name);
            }
            // Cari voice laki-laki
            else if (voiceName.includes('male') || voiceName.includes('man') || voiceName.includes('boy')) {
                maleVoice = voice;
                console.log('Voice laki-laki default ditemukan:', voice.name);
            }
        });
        
        // Jika tidak ditemukan, gunakan heuristik
        if (!maleVoice && allVoices.length > 0) {
            maleVoice = allVoices[0];
            console.log('Default ke voice pertama untuk laki-laki:', maleVoice.name);
        }
        
        if (!femaleVoice && allVoices.length > 1) {
            femaleVoice = allVoices[1] || allVoices[0];
            console.log('Default ke voice alternatif untuk perempuan:', femaleVoice ? femaleVoice.name : 'tidak ada');
        }
    }
    
    // Pastikan setidaknya ada satu voice
    if (!maleVoice && indonesianVoices.length > 0) {
        maleVoice = indonesianVoices[0];
    }
    
    if (!femaleVoice && indonesianVoices.length > 0) {
        femaleVoice = indonesianVoices[0];
    }
    
    console.log('Voice laki-laki:', maleVoice ? maleVoice.name : 'tidak ditemukan');
    console.log('Voice perempuan:', femaleVoice ? femaleVoice.name : 'tidak ditemukan');
    
    return { maleVoice, femaleVoice, indonesianVoices };
}

// ===== INISIALISASI SPEECH RECOGNITION =====
// Mengatur speech recognition untuk input suara
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Konfigurasi speech recognition
        recognition.continuous = false; // Tidak kontinu, berhenti setelah selesai
        recognition.interimResults = false; // Tidak perlu hasil sementara
        recognition.lang = 'id-ID'; // Bahasa Indonesia
        
        // Event handler saat mulai mendengarkan
        recognition.onstart = () => {
            isListening = true;
            voiceInputBtn.classList.add('listening');
            voiceStatusText.textContent = 'Mendengarkan...';
            markUserInteraction();
        };
        
        // Event handler saat mendapatkan hasil
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            voiceInputBtn.classList.remove('listening');
            isListening = false;
            voiceStatusText.textContent = 'Voice input siap';
            
            // Auto kirim setelah 0.5 detik
            setTimeout(() => {
                if (userInput.value.trim()) {
                    sendMessage();
                }
            }, 500);
        };
        
        // Event handler saat error
        recognition.onerror = (event) => {
            console.error('Error speech recognition:', event.error);
            voiceInputBtn.classList.remove('listening');
            isListening = false;
            voiceStatusText.textContent = 'Voice input siap';
            
            if (event.error === 'not-allowed') {
                showNotification('Akses mikrofon ditolak. Silakan izinkan akses mikrofon di pengaturan browser.');
            } else if (event.error === 'no-speech') {
                voiceStatusText.textContent = 'Tidak ada suara yang terdeteksi';
                setTimeout(() => {
                    voiceStatusText.textContent = 'Voice input siap';
                }, 2000);
            }
        };
        
        // Event handler saat selesai mendengarkan
        recognition.onend = () => {
            voiceInputBtn.classList.remove('listening');
            isListening = false;
            voiceStatusText.textContent = 'Voice input siap';
        };
    } else {
        // Jika browser tidak mendukung, sembunyikan tombol voice input
        voiceInputBtn.style.display = 'none';
        voiceStatusText.textContent = 'Voice input tidak didukung';
    }
}

// ===== TOGGLE VOICE OUTPUT =====
// Fungsi untuk menyalakan/mematikan suara AI
function toggleVoiceOutput() {
    isVoiceEnabled = !isVoiceEnabled;
    markUserInteraction();
    
    if (isVoiceEnabled) {
        voiceToggleBtn.classList.add('active');
        voiceToggleBtn.title = 'Nonaktifkan suara AI';
        voiceToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        showNotification('Suara AI diaktifkan');
        
        // Bicarakan pesan terakhir jika ada
        const lastBotMessage = document.querySelector('.message.bot-message:last-child .message-content p');
        if (lastBotMessage) {
            setTimeout(() => {
                speakText(lastBotMessage.textContent);
            }, 300);
        }
    } else {
        voiceToggleBtn.classList.remove('active');
        voiceToggleBtn.title = 'Aktifkan suara AI';
        voiceToggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        
        // Hentikan suara yang sedang diputar
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        showNotification('Suara AI dinonaktifkan');
    }
}

// ===== FUNGSI TEXT-TO-SPEECH BAHASA INDONESIA =====
// Fungsi untuk mengonversi teks menjadi suara bahasa Indonesia
function speakText(text, callback) {
    if (!isVoiceEnabled || !speechSynthesis) {
        if (callback) callback();
        return;
    }
    
    // Pastikan user sudah berinteraksi dengan halaman
    if (!userInteracted) {
        console.log('TTS ditunda - menunggu interaksi user');
        if (callback) callback();
        return;
    }
    
    // Bersihkan teks untuk suara
    const cleanText = text
        .replace(/\*\*/g, '') // Hapus bold markdown
        .replace(/\*/g, '')   // Hapus italic markdown
        .replace(/#/g, '')    // Hapus heading markdown
        .replace(/\[.*?\]/g, '') // Hapus link
        .replace(/\(.*?\)/g, '') // Hapus parentheses
        .replace(/\n/g, '. ') // Ganti newline dengan titik
        .replace(/\s+/g, ' ') // Gabungkan spasi ganda
        .trim();
    
    if (!cleanText) {
        if (callback) callback();
        return;
    }
    
    // Hentikan suara yang sedang diputar
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID'; // SET BAHASA INDONESIA
    
    // ===== PENGATURAN SUARA BERDASARKAN JENIS =====
    if (useFemaleVoice) {
        // PENGATURAN UNTUK SUARA PEREMPUAN
        utterance.rate = 1.1;    // Sedikit lebih cepat
        utterance.pitch = 1.3;   // Pitch lebih tinggi untuk suara perempuan
        utterance.volume = 1.0;  // Volume maksimal
        
        // Gunakan voice perempuan jika tersedia
        if (femaleVoice) {
            utterance.voice = femaleVoice;
            console.log('Menggunakan voice perempuan:', femaleVoice.name);
        } else if (maleVoice) {
            // Fallback ke voice laki-laki dengan pitch tinggi
            utterance.voice = maleVoice;
            utterance.pitch = 1.4; // Pitch lebih tinggi
            console.log('Fallback ke voice laki-laki dengan pitch tinggi');
        }
    } else {
        // PENGATURAN UNTUK SUARA LAKI-LAKI
        utterance.rate = 0.95;   // Sedikit lebih lambat untuk natural
        utterance.pitch = 0.8;   // Pitch lebih rendah untuk suara laki-laki
        utterance.volume = 1.0;  // Volume maksimal
        
        // Gunakan voice laki-laki jika tersedia
        if (maleVoice) {
            utterance.voice = maleVoice;
            console.log('Menggunakan voice laki-laki:', maleVoice.name);
        } else if (femaleVoice) {
            // Fallback ke voice perempuan dengan pitch rendah
            utterance.voice = femaleVoice;
            utterance.pitch = 0.7; // Pitch lebih rendah
            console.log('Fallback ke voice perempuan dengan pitch rendah');
        }
    }
    
    // Jika tidak ada voice spesifik, gunakan pitch untuk membedakan
    if (!utterance.voice && indonesianVoices.length > 0) {
        utterance.voice = indonesianVoices[0];
        console.log('Menggunakan voice default dengan pengaturan pitch');
    }
    
    // Event handler saat mulai berbicara
    utterance.onstart = () => {
        currentUtterance = utterance;
        console.log(`TTS mulai berbicara (${useFemaleVoice ? 'Perempuan' : 'Laki-laki'})`);
        
        // Feedback visual pada tombol TTS
        const ttsButtons = document.querySelectorAll('.tts-btn');
        ttsButtons.forEach(btn => {
            if (btn.getAttribute('data-text') === text) {
                btn.classList.add('playing');
            }
        });
    };
    
    // Event handler saat selesai berbicara
    utterance.onend = () => {
        console.log('TTS selesai berbicara');
        currentUtterance = null;
        
        // Hapus feedback visual
        const ttsButtons = document.querySelectorAll('.tts-btn.playing');
        ttsButtons.forEach(btn => {
            setTimeout(() => {
                btn.classList.remove('playing');
            }, 500);
        });
        
        if (callback) callback();
    };
    
    // Event handler saat error
    utterance.onerror = (event) => {
        console.error('Error speech synthesis:', event);
        currentUtterance = null;
        
        // Hapus feedback visual
        const ttsButtons = document.querySelectorAll('.tts-btn.playing');
        ttsButtons.forEach(btn => {
            btn.classList.remove('playing');
        });
        
        if (callback) callback();
    };
    
    // Delay kecil untuk memastikan semuanya siap
    setTimeout(() => {
        try {
            speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Error speaking:', error);
            if (callback) callback();
        }
    }, 100);
}

// ===== BERSIHKAN RESPON AI =====
// Fungsi untuk membersihkan format markdown dari respon AI
function cleanAIResponse(text) {
    if (!text) return '';
    
    let cleaned = text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Hapus bold
        .replace(/\*(.*?)\*/g, '$1')     // Hapus italic
        .replace(/#{1,6}\s*/g, '')       // Hapus heading
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Hapus link, simpan teks
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Hapus code blocks
        .replace(/\n{3,}/g, '\n\n')      // Batasi newline berulang
        .replace(/[👉👍❤️✨🎯🚀]/g, '') // Hapus emoji
        .trim();
    
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
    
    // Batasi maksimal 200 kata
    const words = cleaned.split(' ');
    if (words.length > 200) {
        cleaned = words.slice(0, 200).join(' ') + '...';
    }
    
    return cleaned;
}

// ===== EVENT LISTENERS UNTUK INTERAKSI USER =====
// Catat interaksi user untuk mengaktifkan TTS
document.addEventListener('click', markUserInteraction);
document.addEventListener('keydown', markUserInteraction);
document.addEventListener('touchstart', markUserInteraction);

// ===== TOGGLE CHATBOT =====
// Event listener untuk tombol toggle chatbot
chatbotToggle.addEventListener('click', () => {
    isChatbotOpen = !isChatbotOpen;
    markUserInteraction();
    if (isChatbotOpen) {
        chatbotContainer.classList.add('active');
    } else {
        chatbotContainer.classList.remove('active');
    }
});

// ===== TUTUP CHATBOT =====
// Event listener untuk tombol tutup chatbot
closeBtn.addEventListener('click', () => {
    chatbotContainer.classList.remove('active');
    isChatbotOpen = false;
    markUserInteraction();
    
    // Hentikan suara yang sedang diputar
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
});

// ===== RESIZE CHATBOT =====
// Event listener untuk tombol resize chat
resizeBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    markUserInteraction();
    if (isExpanded) {
        chatbotContainer.classList.add('expanded');
        resizeBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';
        resizeBtn.title = 'Kecilkan';
    } else {
        chatbotContainer.classList.remove('expanded');
        resizeBtn.innerHTML = '<i class="fas fa-expand-alt"></i>';
        resizeBtn.title = 'Besar';
    }
});

// ===== TOGGLE VOICE =====
// Event listener untuk tombol toggle suara
voiceToggleBtn.addEventListener('click', toggleVoiceOutput);

// ===== GANTI JENIS SUARA =====
// Event listener untuk tombol ganti jenis suara
voiceTypeBtn.addEventListener('click', changeVoiceType);

// ===== VOICE INPUT =====
// Event listener untuk tombol input suara
voiceInputBtn.addEventListener('click', () => {
    markUserInteraction();
    
    if (!recognition) {
        showNotification('Voice input tidak didukung di browser Anda');
        return;
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            voiceStatusText.textContent = 'Error memulai voice input';
            showNotification('Tidak bisa mengakses mikrofon. Periksa izin browser.');
        }
    }
});

// ===== KIRIM PESAN =====
// Fungsi untuk mengirim pesan dari user
function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    markUserInteraction();
    addMessage(message, 'user');
    userInput.value = '';
    showTypingIndicator();
    getAIResponse(message);
}

// ===== TAMBAHKAN PESAN KE CHAT =====
// Fungsi untuk menambahkan pesan ke area chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const displayText = cleanAIResponse(text);
    contentDiv.innerHTML = `<p>${displayText.replace(/\n/g, '<br>')}</p>`;
    
    messageDiv.appendChild(contentDiv);
    
    // Tambahkan tombol TTS untuk pesan bot
    if (sender === 'bot') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        const ttsButton = document.createElement('button');
        ttsButton.className = 'tts-btn';
        ttsButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        ttsButton.title = 'Dengarkan';
        ttsButton.setAttribute('data-text', displayText);
        
        ttsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            markUserInteraction();
            const textToSpeak = ttsButton.getAttribute('data-text');
            speakText(textToSpeak);
        });
        
        actionsDiv.appendChild(ttsButton);
        messageDiv.appendChild(actionsDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    // Scroll ke bawah untuk melihat pesan terbaru
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== TAMPILKAN TYPING INDICATOR =====
// Fungsi untuk menampilkan indikator sedang mengetik
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== HAPUS TYPING INDICATOR =====
// Fungsi untuk menghapus indikator sedang mengetik
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// ===== DAPATKAN RESPON DARI AI =====
// Fungsi untuk mendapatkan respon dari API AI
async function getAIResponse(userMessage) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Mr. Great Photography Portfolio'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-r1-0528:free',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_CONTEXT
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 300, // Batasi token untuk respon singkat
                temperature: 0.7 // Kreativitas AI
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        removeTypingIndicator();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let aiResponse = data.choices[0].message.content;
            aiResponse = cleanAIResponse(aiResponse);
            addMessage(aiResponse, 'bot');
            
            // Bicarakan respon jika suara diaktifkan
            if (isVoiceEnabled) {
                setTimeout(() => {
                    speakText(aiResponse);
                }, 300); // Delay kecil untuk UX yang lebih baik
            }
        } else {
            const errorMessage = 'Maaf, saya mengalami kesalahan dalam memproses permintaan Anda. Silakan coba lagi.';
            addMessage(errorMessage, 'bot');
            
            if (isVoiceEnabled) {
                setTimeout(() => {
                    speakText(errorMessage);
                }, 300);
            }
        }
        
    } catch (error) {
        console.error('Error getting AI response:', error);
        removeTypingIndicator();
        
        // Fallback responses jika API error
        const fallbackResponses = [
            "Maaf, saya sedang mengalami kesalahan koneksi. Anda bisa menghubungi Darrell langsung di +62 812 3456 7890 untuk informasi lebih lanjut.",
            "Sepertinya ada masalah dengan koneksi saya. Untuk pertanyaan cepat tentang layanan fotografi, Anda bisa melihat bagian Services di halaman ini.",
            "Saya sedang tidak bisa mengakses database saya. Informasi layanan fotografi Mr. Great: Portrait, Event, Commercial, Travel/Landscape, dan Photo Editing."
        ];
        
        const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        const cleanedResponse = cleanAIResponse(randomResponse);
        addMessage(cleanedResponse, 'bot');
        
        if (isVoiceEnabled) {
            setTimeout(() => {
                speakText(cleanedResponse);
            }, 300);
        }
    }
}

// ===== TAMPILKAN NOTIFIKASI =====
// Fungsi untuk menampilkan notifikasi sementara
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'chatbot-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 180px;
        right: 30px;
        background: var(--dark-bg);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 1001;
        animation: fadeInOut 3s ease;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ===== QUICK ACTION BUTTONS =====
// Event listener untuk tombol aksi cepat
document.querySelectorAll('.quick-action-btn').forEach(button => {
    button.addEventListener('click', () => {
        markUserInteraction();
        const question = button.getAttribute('data-question');
        userInput.value = question;
        sendMessage();
    });
});

// ===== EVENT LISTENERS =====
// Event listener untuk tombol kirim
sendButton.addEventListener('click', sendMessage);

// Event listener untuk input enter
userInput.addEventListener('keypress', (e) => {
    markUserInteraction();
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// ===== INISIALISASI VOICES =====
// Event handler ketika voices sudah dimuat
function initializeVoices() {
    console.log('Menginisialisasi voices...');
    const { maleVoice: foundMaleVoice, femaleVoice: foundFemaleVoice } = findAndSelectIndonesianVoices();
    
    // Simpan voice yang ditemukan
    maleVoice = foundMaleVoice;
    femaleVoice = foundFemaleVoice;
    
    // Tampilkan semua voice yang tersedia untuk debugging
    const allVoices = speechSynthesis.getVoices();
    console.log('Semua voices yang tersedia:', allVoices.map(v => `${v.name} (${v.lang})`));
    console.log('Voice laki-laki yang dipilih:', maleVoice ? `${maleVoice.name} (${maleVoice.lang})` : 'tidak ditemukan');
    console.log('Voice perempuan yang dipilih:', femaleVoice ? `${femaleVoice.name} (${femaleVoice.lang})` : 'tidak ditemukan');
    
    // Jika tidak ada voice laki-laki, coba gunakan pitch untuk membuat efek laki-laki
    if (!maleVoice && allVoices.length > 0) {
        console.log('Tidak ada voice laki-laki spesifik, menggunakan pitch rendah pada voice yang ada');
    }
}

// ===== INISIALISASI CHATBOT =====
// Fungsi untuk menginisialisasi chatbot saat halaman dimuat
function initChatbot() {
    // Inisialisasi speech recognition
    initSpeechRecognition();
    
    // Inisialisasi voices
    initializeVoices();
    
    // Aktifkan suara secara default
    voiceToggleBtn.classList.add('active');
    
    // SET DEFAULT KE SUARA LAKI-LAKI (useFemaleVoice = false)
    useFemaleVoice = false; // Default ke suara laki-laki
    updateVoiceTypeUI(); // Update UI sesuai default
    
    // Buka chatbot otomatis setelah 3 detik
    setTimeout(() => {
        if (!isChatbotOpen) {
            chatbotContainer.classList.add('active');
            isChatbotOpen = true;
            markUserInteraction();
            
            // Auto-bicara pesan selamat datang setelah chatbot terbuka
            if (isVoiceEnabled) {
                setTimeout(() => {
                    const welcomeText = "Halo! Saya asisten virtual Mr. Great. Saya bisa membantu Anda dengan informasi tentang layanan fotografi, portfolio, atau menjawab pertanyaan seputar fotografi. Ada yang bisa saya bantu?";
                    speakText(welcomeText);
                }, 1000);
            }
        }
    }, 3000);
}

// ===== INISIALISASI SAAT HALAMAN DIMUAT =====
// Jalankan inisialisasi chatbot saat DOM siap
window.addEventListener('DOMContentLoaded', () => {
    // Tunggu voices dimuat terlebih dahulu
    if (speechSynthesis.getVoices().length > 0) {
        initChatbot();
    } else {
        speechSynthesis.onvoiceschanged = initChatbot;
    }
});

// ===== HENTIKAN SUARA SAAT HALAMAN TIDAK AKTIF =====
// Hentikan suara saat user berpindah tab/window
document.addEventListener('visibilitychange', () => {
    if (document.hidden && speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
});