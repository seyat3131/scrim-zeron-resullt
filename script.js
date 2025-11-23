document.addEventListener('DOMContentLoaded', () => {
    
    // =======================================================
    // 1. FIREBASE KONFİGÜRASYONU 
    // =======================================================
    // Buraya kendi Firebase Realtime Database bilgileriniz gelmelidir.
    const firebaseConfig = {
        apiKey: "AIzaSyAuEhr-2l_PUJ5LfVFkYy9Z3UvRRLZgOjQ",
        authDomain: "zeron-result.firebaseapp.com",
        projectId: "zeron-result",
        storageBucket: "zeron-result.firebasestorage.app",
        messagingSenderId: "896044676862",
        appId: "1:896044676862:web:7b7e26700dca7fabc257af",
        measurementId: "G-SVPZPYYPDD",
        databaseURL: "https://zeron-result-default-rtdb.europe-west1.firebasedatabase.app" 
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const dbRef = database.ref('scoreboard/teams'); // Canlı verinin yolu
    // =======================================================


    // YÖNETİCİ TIKLAMA İŞLEVİ AYARLARI
    const REQUIRED_CLICKS = 50; 
    const TOTAL_TEAMS = 25; // 25 Takım Slotu
    const DEFAULT_COLOR = '#A9A9A9'; // Koyu Gri (Siyah-Kırmızı temaya uygun)
    let clickCount = 0;
    let editMode = false;
    
    const adminPanel = document.querySelector('.admin-panel');
    const headerElement = document.querySelector('header');
    const clickCounterElement = document.getElementById('click-counter');

    adminPanel.style.display = 'none'; 
    clickCounterElement.style.display = 'none'; // Sayaç başlangıçta gizli

    // TIKLAMA ALANI: Yönetici panelini açmak için HEADER kullanılır
    headerElement.addEventListener('click', () => {
        if (adminPanel.style.display === 'none') {
            clickCount++;
            
            if (clickCount >= REQUIRED_CLICKS) {
                adminPanel.style.display = 'block'; 
                clickCounterElement.style.display = 'inline-block'; // Admin aktifken sayacı göster
                clickCounterElement.textContent = `YÖNETİCİ AKTİF`; 
                console.log('YÖNETİCİ KONTROL PANELİ ETKİNLEŞTİRİLDİ.');
                clickCount = 0; 
            }
        }
    });
    
    // --- Canlı Tarih Güncelleme ---
    const liveDateElement = document.getElementById('live-date');
    function updateLiveDate() {
        const now = new Date();
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const formattedDate = now.toLocaleDateString('tr-TR', options);
        liveDateElement.textContent = formattedDate;
    }
    setInterval(updateLiveDate, 1000);
    updateLiveDate(); 

    // --- Puan Durumu Verisi ve Görünüm Fonksiyonları ---
    let initialScores = [];
    // Başlangıç verilerini (25 slot) oluştur
    for (let i = 1; i <= TOTAL_TEAMS; i++) {
        initialScores.push({ 
            rank: `#${i < 10 ? '0' + i : i}`, 
            team: `TAKIM ADI ${i}`, 
            color: DEFAULT_COLOR, 
            total: '0' 
        });
    }

    let scores = initialScores;
    const scoreRowsContainer = document.getElementById('score-rows');

    function renderScoreboard(isEditable) {
        scoreRowsContainer.innerHTML = ''; 
        
        // 25 takım: 13 sol / 12 sağ
        const half = Math.ceil(TOTAL_TEAMS / 2); 
        
        for (let i = 0; i < half; i++) {
            const row = document.createElement('div');
            row.className = 'score-row';

            // SOL TARAF
            const leftData = scores[i] || initialScores[i];
            const teamColorL = leftData.color || DEFAULT_COLOR;

            row.innerHTML += `
                <span class="score-cell rank-col">${leftData.rank}</span>
                <span class="score-cell team-col ${isEditable ? 'editable' : ''}" data-index="${i}" data-field="team" style="color: ${teamColorL};">${leftData.team}</span>
                <span class="score-cell color-col ${isEditable ? 'editable color-editable' : ''}" data-index="${i}" data-field="color">
                    ${isEditable ? teamColorL : `<div class="color-preview" style="background-color: ${teamColorL};"></div>`}
                </span>
                <span class="score-cell total-col ${isEditable ? 'editable' : ''}" data-index="${i}" data-field="total">${leftData.total}</span>
            `;

            // SAĞ TARAF
            const rightIndex = i + half;
            
            if (rightIndex < TOTAL_TEAMS) {
                const rightData = scores[rightIndex] || initialScores[rightIndex];
                const teamColorR = rightData.color || DEFAULT_COLOR;
                
                row.innerHTML += `
                    <span class="score-cell rank-col">${rightData.rank}</span>
                    <span class="score-cell team-col ${isEditable ? 'editable' : ''}" data-index="${rightIndex}" data-field="team" style="color: ${teamColorR};">${rightData.team}</span>
                    <span class="score-cell color-col ${isEditable ? 'editable color-editable' : ''}" data-index="${rightIndex}" data-field="color">
                         ${isEditable ? teamColorR : `<div class="color-preview" style="background-color: ${teamColorR};"></div>`}
                    </span>
                    <span class="score-cell total-col ${isEditable ? 'editable' : ''}" data-index="${rightIndex}" data-field="total">${rightData.total}</span>
                `;
            } else {
                 // 25. takım için boş satır simetriyi korur
                 row.innerHTML += `
                    <span class="score-cell rank-col"></span>
                    <span class="score-cell team-col"></span>
                    <span class="score-cell color-col"></span>
                    <span class="score-cell total-col"></span>
                `;
            }

            scoreRowsContainer.appendChild(row);
        }

        // Düzenlenebilirliği ayarla
        if (isEditable) {
            document.querySelectorAll('.editable').forEach(cell => {
                cell.setAttribute('contenteditable', 'true');
                if (cell.classList.contains('color-editable')) {
                    const index = cell.getAttribute('data-index');
                    cell.textContent = scores[index].color || DEFAULT_COLOR; 
                }
            });
        } else {
            document.querySelectorAll('.score-cell').forEach(cell => {
                cell.removeAttribute('contenteditable');
            });
        }
    }

    // =======================================================
    // FIREBASE OKUMA (CANLI DİNLEME) İŞLEVİ - HERKES GÖRÜR
    // =======================================================
    dbRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            scores = snapshot.val();
        } else {
            scores = initialScores;
        }
        renderScoreboard(editMode);
    }, (error) => {
        console.error("Firebase veri okuma hatası: ", error);
        console.error("Veri yüklenirken bir hata oluştu.");
    });


    // --- Yönetici Düzenleme ve Kayıt Fonksiyonları ---
    const toggleButton = document.getElementById('toggle-edit-mode');
    const saveButton = document.getElementById('save-data');

    toggleButton.addEventListener('click', () => {
        if (adminPanel.style.display === 'none') return; 
        
        editMode = !editMode;
        if (editMode) {
            console.log('Düzenleme Modu Açıldı.');
        } else {
            console.log('Düzenleme Modu Kapatıldı.');
        }
        renderScoreboard(editMode);
    });

    saveButton.addEventListener('click', () => {
        if (!editMode) {
            console.log('Önce Düzenleme Modunu açmanız gerekiyor.');
            return;
        }
        
        // 1. Düzenlenen verileri topla
        document.querySelectorAll('.editable').forEach(cell => {
            const index = cell.getAttribute('data-index');
            const field = cell.getAttribute('data-field');
            let newValue = cell.textContent.trim();
            
            // Renk alanı doğrulama (HEX kodu)
            if (field === 'color') {
                if (newValue.length > 0 && newValue[0] !== '#') {
                    newValue = '#' + newValue;
                }
                // Basit HEX kontrolü ve geçersizse varsayılan renk
                if (!/^#[0-9A-F]{6}$/i.test(newValue)) {
                    newValue = DEFAULT_COLOR; 
                    console.warn(`Geçersiz renk kodu. Varsayılan renk kullanıldı.`);
                }
            }
            
            // Toplam (total) alanı doğrulama (sadece sayı)
            if (field === 'total') {
                newValue = newValue.replace(/[^0-9]/g, '');
                if (newValue === '') {
                    newValue = '0';
                }
            }

            if (scores[index]) {
                scores[index][field] = newValue;
            }
        });

        // 2. FIREBASE'E YAZ
        dbRef.set(scores)
            .then(() => {
                console.log('Veriler başarıyla kaydedildi ve canlı olarak güncellendi!');
                editMode = false;
                renderScoreboard(editMode);
            })
            .catch((error) => {
                console.error('HATA: Veritabanına kayıt başarısız oldu: ', error);
            });
    });
});
