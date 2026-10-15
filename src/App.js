import React, { useState, useEffect } from 'react';

export default function App() {
  // --- 1. STATE DASAR & RBAC ---
  const [userRole, setUserRole] = useState(null); // 'siswa', 'guru', 'mandiri'
  const [activeTab, setActiveTab] = useState('landing');
  
  const [apiKey, setApiKey] = useState('');
  const [isApiValid, setIsApiValid] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isValidatingApi, setIsValidatingApi] = useState(false);

  // Database Global Kelas
  const [allClasses, setAllClasses] = useState(() => {
    try {
      const saved = localStorage.getItem('PENA_ALL_CLASSES');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [currentClass, setCurrentClass] = useState(null);
  
  // State Modals
  const [showPinModal, setShowPinModal] = useState(false);
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [showMandiriModal, setShowMandiriModal] = useState(false);
  const [mandiriNameInput, setMandiriNameInput] = useState('');

  // --- 2. KAMUS PEMANTIK ENNIS & POLYA ---
  const ennisPrompts = {
    'Penjelasan Sederhana': 'Apakah argumen awal dari tulisanmu jelas, fokus, dan tidak ambigu? Jelaskan.',
    'Keterampilan Dasar': 'Apakah sumber referensi atau premis dasar naskah tersebut kredibel? Buktikan.',
    'Menyimpulkan': 'Apakah kesimpulan ditarik berdasarkan bukti yang logis dan relevan? Jabarkan logikanya.',
    'Penjelasan Lebih Lanjut': 'Adakah asumsi tersembunyi yang perlu diuji kebenarannya dalam naskah tersebut? Sebutkan.',
    'Taktik & Strategi': 'Apakah argumenmu mempertimbangkan implikasi dan tindakan nyata? Beri contoh.'
  };

  const polyaPrompts = {
    'Memahami Masalah': 'Apa pokok permasalahan krusial yang sedang dibahas pada naskah secara spesifik?',
    'Merencanakan Penyelesaian': 'Bagaimana urutan logikamu membuktikan atau membantah naskah tersebut?',
    'Melaksanakan Rencana': 'Jelaskan eksekusi pembuktianmu secara rasional dan bertahap di sini.',
    'Memeriksa Kembali': 'Jika ada pihak yang menentang kesimpulanmu, bagaimana pembelaanmu?'
  };

  // --- 3. MANAJEMEN DATABASE TERISOLASI ---
  const getStorageKeys = (kelas, role) => {
    if (role === 'mandiri') return { students: 'PENA_MANDIRI_STU', submissions: 'PENA_MANDIRI_SUB' };
    if (!kelas) return { students: 'PENA_STU_DEFAULT', submissions: 'PENA_SUB_DEFAULT' };
    const prefix = `PENA_${kelas.teacher}_${kelas.subject}_${kelas.pin}`.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return { students: `${prefix}_STUDENTS`, submissions: `${prefix}_SUBMISSIONS` };
  };

  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);

  // Load Data
  useEffect(() => {
    if (userRole === 'mandiri') {
      const keys = getStorageKeys(null, 'mandiri');
      const savedSub = localStorage.getItem(keys.submissions);
      if (savedSub) setSubmissions(JSON.parse(savedSub));
      return;
    }

    if (!currentClass) return;
    const keys = getStorageKeys(currentClass, userRole);
    try {
      const savedStudents = localStorage.getItem(keys.students);
      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
      } else if (userRole === 'guru') {
        setStudents([]);
      }

      const savedSub = localStorage.getItem(keys.submissions);
      setSubmissions(savedSub ? JSON.parse(savedSub) : []);
    } catch (e) { console.error(e); }
  }, [currentClass, userRole]);

  // Save Data Realtime
  useEffect(() => {
    if (userRole && (currentClass || userRole === 'mandiri')) {
      const keys = getStorageKeys(currentClass, userRole);
      if (userRole !== 'mandiri') {
        localStorage.setItem(keys.students, JSON.stringify(students));
      }
      localStorage.setItem(keys.submissions, JSON.stringify(submissions));
    }
  }, [students, submissions, currentClass, userRole]);

  // --- 4. HANDLER LOGIN & LOGOUT ---
  const [classCodeInput, setClassCodeInput] = useState('');
  const [loginStudentName, setLoginStudentName] = useState('');
  const [resolvedStudentList, setResolvedStudentList] = useState([]);
  const [quickStudentName, setQuickStudentName] = useState('');

  const handleVerifyClassCode = (e) => {
    e.preventDefault();
    const cleanCode = classCodeInput.trim();
    
    const latestClasses = JSON.parse(localStorage.getItem('PENA_ALL_CLASSES') || '[]');
    const foundClass = latestClasses.find(c => c.pin === cleanCode);
    
    if (foundClass) {
      setCurrentClass(foundClass);
      const keys = getStorageKeys(foundClass, 'siswa');
      const savedStu = localStorage.getItem(keys.students);
      const parsedStu = savedStu ? JSON.parse(savedStu) : [];
      setResolvedStudentList(parsedStu);
    } else {
      alert(`❌ Kode Kelas "${cleanCode}" tidak ditemukan!\n\nPastikan Guru sudah membuat kelas dengan Kode tersebut.`);
      setCurrentClass(null);
    }
  };

  const handleStudentLoginFinal = (e) => {
    e.preventDefault();
    // PERBAIKAN: Siswa cukup pilih nama yang sudah didaftarkan guru, tanpa PIN tambahan.
    const student = resolvedStudentList.find(s => s.name === loginStudentName);
    if (student) {
      setCurrentStudent(student);
      setUserRole('siswa');
      setActiveTab('introSiswa');
    } else {
      alert('❌ Harap pilih nama Anda dari daftar!');
    }
  };

  const handleQuickRegisterStudent = (e) => {
    e.preventDefault();
    if (!quickStudentName.trim()) return;
    const name = quickStudentName.trim();
    const newStudent = { id: Date.now(), name };
    
    const updatedList = [...resolvedStudentList, newStudent];
    setResolvedStudentList(updatedList);
    
    const keys = getStorageKeys(currentClass, 'siswa');
    localStorage.setItem(keys.students, JSON.stringify(updatedList));
    
    setCurrentStudent(newStudent);
    setUserRole('siswa');
    setActiveTab('introSiswa');
    alert(`✅ Berhasil masuk sebagai ${name}!`);
  };

  const handleRegisterOrLoginGuru = (e) => {
    e.preventDefault();
    const tName = teacherNameInput.trim();
    const sName = subjectInput.trim();
    const pin = pinInput.trim();

    if (!tName || !sName || !pin) return alert('Semua kolom wajib diisi!');
    
    const latestClasses = JSON.parse(localStorage.getItem('PENA_ALL_CLASSES') || '[]');
    let targetClass = latestClasses.find(c => c.teacher.toLowerCase() === tName.toLowerCase() && c.subject.toLowerCase() === sName.toLowerCase());
    
    if (targetClass) {
      if (targetClass.pin !== pin) return alert('❌ Sandi/Kode guru salah untuk kelas ini!');
    } else {
      const isPinTaken = latestClasses.find(c => c.pin === pin);
      if (isPinTaken) {
        return alert(`❌ Kode "${pin}" sudah dipakai kelas lain. Gunakan Kode/Sandi yang berbeda!`);
      }
      targetClass = { teacher: tName, subject: sName, pin: pin, id: Date.now() };
      const updatedClasses = [...latestClasses, targetClass];
      setAllClasses(updatedClasses);
      localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(updatedClasses));
    }

    setCurrentClass(targetClass);
    setUserRole('guru');
    setShowPinModal(false);
    setActiveTab('guruDashboard');
    alert(`✅ Kelas berhasil dibuka! Berikan KODE KELAS ini ke siswa Anda: ${pin}`);
  };

  const handleMandiriLogin = (e) => {
    e.preventDefault();
    setCurrentStudent({ id: 'mandiri-' + Date.now(), name: mandiriNameInput.trim() });
    setUserRole('mandiri');
    setShowMandiriModal(false);
    setActiveTab('introSiswa');
  };

  const handleLogout = () => {
    if (userRole === 'mandiri') {
      const keys = getStorageKeys(null, 'mandiri');
      localStorage.removeItem(keys.submissions); 
    }
    setCurrentStudent(null);
    setCurrentClass(null);
    setUserRole(null);
    setIsApiValid(false);
    setActiveTab('landing');
    setClassCodeInput('');
  };

  // --- 5. KANVAS & INTEGRASI GEMINI AI ---
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [formData, setFormData] = useState({
    naskahText: '', ennisIndicator: 'Penjelasan Sederhana',
    polyaStep: 'Memahami Masalah', deconstructionText: ''
  });

  useEffect(() => {
    if (activeTab !== 'workspace' || !currentStudent) return;
    const handleVisibilityChange = () => {
      if (document.hidden) setTabSwitchCount(prev => prev + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, currentStudent]);

  const activeSubmissionId = submissions.find(s => s.studentName === currentStudent?.name)?.id;
  const activePortfolio = submissions.find(s => s.id === activeSubmissionId);
  const isWorkspaceLocked = activePortfolio && activePortfolio.status !== 'Minta Revisi';

  // --- FUNGSI FETCH KE API GOOGLE (HANYA GEMINI 1.5 FLASH) ---
  const callGeminiAPI = async (key, promptText) => {
    // PERBAIKAN: Kunci model mutlak ke gemini-1.5-flash (model terbaru yang valid).
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
    
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error?.message || "Koneksi ditolak Google.");
    }
    
    return data;
  };

  const checkApiValidity = async (e) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (cleanKey.length < 15) return alert('❌ API Key tidak valid.');
    
    setIsValidatingApi(true);
    try {
      // Test Ping AI
      await callGeminiAPI(cleanKey, "Balas dengan kata: KONEKSI SUKSES");
      
      setIsApiValid(true);
      setApiKey(cleanKey);
      setActiveTab('workspace');
      alert('✅ Kunci AI Berhasil Terhubung!');
    } catch (err) {
      alert(`❌ GAGAL TERHUBUNG KE GOOGLE:\n\n${err.message}\n\nPastikan API Key benar dan Anda memiliki akses internet.`);
    } finally {
        setIsValidatingApi(false);
    }
  };

  const handleSubmitCanvas = async (e) => {
    e.preventDefault();
    if (!isApiValid) return alert('Masukkan API Key terlebih dahulu di tab 2.');
    setIsSubmittingTask(true);

    let diagnosis = "";
    const hasViolations = isPasted || tabSwitchCount > 0;

    if (hasViolations) {
      diagnosis = `⚠️ ANOMALI TERDETEKSI: Pindah tab ${tabSwitchCount}x, Copy-paste: ${isPasted ? 'Ya' : 'Tidak'}. Argumen kehilangan validitas analitis karena indikasi manipulasi (menyontek).`;
    } else {
      try {
        // PERBAIKAN: Prompt yang sangat ketat agar AI mendeteksi jawaban asal-asalan.
        const prompt = `
          Tugas Evaluasi Kritis Pendidikan:
          Seorang siswa diminta menganalisis secara logis sebuah naskah.
          
          Naskah yang dianalisis: "${formData.naskahText}"
          Jawaban Siswa (Fokus ${formData.ennisIndicator} & Tahap ${formData.polyaStep}): "${formData.deconstructionText}"
          
          INSTRUKSI UNTUK AI:
          Jadilah dosen penguji yang sangat kritis. 
          1. Jika jawaban siswa asal-asalan, ngawur, terlalu pendek, atau tidak nyambung dengan Naskah sama sekali, NYATAKAN SALAH dan berikan kritikan pedas.
          2. Jika jawaban siswa logis dan benar-benar membedah naskah sesuai fokusnya, berikan pujian analitis.
          Jawab dengan maksimal 3 kalimat tegas.
        `;

        const data = await callGeminiAPI(apiKey, prompt);
        diagnosis = "🤖 Evaluasi AI (Gemini): " + data.candidates[0].content.parts[0].text;
      } catch (err) {
        diagnosis = `⚠️ Sistem AI Gagal memproses: ${err.message}. Teks tersimpan secara lokal tanpa evaluasi AI.`;
      }
    }

    const newSubmission = {
      id: Date.now(),
      certNumber: `PENA-26-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: currentStudent.name,
      mode: userRole === 'mandiri' ? 'Mandiri (Privat)' : 'Tugas Kelas',
      naskahText: formData.naskahText, ennis: formData.ennisIndicator,
      polya: formData.polyaStep, deconstructionText: formData.deconstructionText,
      diagnosis, hasCopyPasted: isPasted, tabSwitches: tabSwitchCount,
      timestamp: new Date().toLocaleString(),
      status: userRole === 'mandiri' ? 'Selesai (Simulasi)' : 'Pending Review Guru',
      teacherFeedback: ''
    };
    
    const filtered = submissions.filter(s => s.studentName !== currentStudent.name);
    setSubmissions([newSubmission, ...filtered]);
    setIsPasted(false); setTabSwitchCount(0); setIsSubmittingTask(false);
    setActiveTab('portfolio');
  };

  // --- 6. HANDLER GURU ---
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  const handleTeacherAction = (id, status) => {
    setSubmissions(prev => prev.map(item => item.id === id ? { ...item, status, teacherFeedback: teacherNoteInput } : item));
    setSelectedSubmission(null);
    setTeacherNoteInput('');
  };

  const handleDeleteStudent = (studentId) => {
    if(window.confirm('Hapus siswa ini beserta seluruh tugasnya?')) {
      const studentToDelete = students.find(s => s.id === studentId);
      setStudents(students.filter(s => s.id !== studentId));
      if(studentToDelete) {
        setSubmissions(submissions.filter(sub => sub.studentName !== studentToDelete.name));
      }
    }
  };
  
  const handleResetClass = () => {
    if(window.confirm('PERINGATAN KERAS! Ini akan MENGHAPUS SEMUA DATA SISWA DAN TUGAS di kelas ini. Lanjutkan?')) {
      setStudents([]);
      setSubmissions([]);
    }
  };


  return (
    <div style={styles.appContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 10mm; }
        @media print { 
          body * { visibility: hidden; } 
          #printArea, #printArea * { visibility: visible; }
          #printArea { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; } 
        }
      `}} />

      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>PENA 🛡️</h2>
        {userRole && <button style={styles.textBtn} onClick={handleLogout}>🚪 Keluar</button>}
      </header>

      {/* ================= LANDING PAGE ================= */}
      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <div style={{textAlign: 'center', marginBottom: '25px'}}>
            <h1 style={styles.title}>PENA</h1>
            <p style={styles.subtitle}>Platform Evaluasi Nalar Akademik Berbasis AI</p>
          </div>
          
          <div style={styles.rulesBox}>
            <h3 style={{margin: '0 0 10px 0', color: '#1e3a8a'}}>📖 Apa itu PENA dan Bagaimana Aturan Mainnya?</h3>
            <p style={{margin: '0 0 8px 0', fontSize: '13px', lineHeight: '1.6'}}>
              PENA diciptakan untuk melawan kebiasaan <i>Copy-Paste</i> dari AI. Di sini, mesin AI justru bertindak sebagai <b>Dosen Penguji</b> yang kritis. Anda harus membuktikan bahwa tulisan yang Anda buat murni hasil nalar kritis sendiri.
            </p>
            <ul style={{fontSize: '13px', paddingLeft: '20px', margin: 0, color: '#475569', lineHeight: '1.6'}}>
              <li><b>Tugas Anda:</b> Mendekonstruksi (membongkar logika) sebuah naskah/argumen.</li>
              <li><b>Integritas:</b> DILARANG keras berpindah Tab <i>(Switching)</i> atau melakukan <i>Copy-Paste</i> di area ujian (Kanvas). Jika terdeteksi, AI akan mencatat pelanggaran Anda.</li>
              <li><b>Mesin AI:</b> Jawaban ngawur atau tidak nyambung dengan konteks akan langsung ditolak oleh AI Gemini.</li>
            </ul>
          </div>
          
          <div style={styles.gridMenu}>
            <div style={styles.menuBox} onClick={() => setActiveTab('loginSiswa')}>
              <h3 style={{color: '#2563eb', margin: '0 0 10px 0'}}>🎓 Ruang Siswa</h3>
              <p style={{fontSize: '12px', color: '#64748b'}}>Area ujian. Membutuhkan Kode Kelas dari Guru untuk masuk.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowPinModal(true)}>
              <h3 style={{color: '#16a34a', margin: '0 0 10px 0'}}>👨‍🏫 Ruang Guru</h3>
              <p style={{fontSize: '12px', color: '#64748b'}}>Area admin. Buat kelas, kelola absensi, dan validasi tugas.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowMandiriModal(true)}>
              <h3 style={{color: '#9333ea', margin: '0 0 10px 0'}}>👤 Latihan Mandiri</h3>
              <p style={{fontSize: '12px', color: '#64748b'}}>Uji coba personal. Data akan musnah saat Anda keluar.</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= LOGIN SISWA ================= */}
      {!userRole && activeTab === 'loginSiswa' && (
        <div style={styles.card} className="no-print">
          <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>← Kembali ke Halaman Utama</button>
          <h2 style={{marginTop: '10px'}}>Akses Ruang Kelas</h2>
          
          {!currentClass ? (
            <form onSubmit={handleVerifyClassCode} style={styles.form}>
              <div style={styles.infoBox}><b>Langkah 1:</b> Masukkan Kode Akses yang diberikan oleh Guru Anda.</div>
              <label style={styles.label}>Kode Kelas:</label>
              <input type="password" placeholder="Minta ke guru, misal: SOS123" value={classCodeInput} onChange={(e) => setClassCodeInput(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.btnPrimary}>Cari & Verifikasi Kelas 🔍</button>
            </form>
          ) : (
            <div style={styles.form}>
              <div style={styles.badgeInfo}>
                📚 Kelas Ditemukan: <b>{currentClass.subject}</b> (Pengampu: {currentClass.teacher})
              </div>

              {resolvedStudentList.length > 0 ? (
                <form onSubmit={handleStudentLoginFinal} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <div style={styles.infoBox}><b>Langkah 2:</b> Pilih nama Anda dari daftar absensi.</div>
                  <label style={styles.label}>Pilih Nama Anda di Absensi:</label>
                  <select value={loginStudentName} onChange={(e) => setLoginStudentName(e.target.value)} style={styles.input} required>
                    <option value="" disabled>-- Klik Untuk Memilih Nama Anda --</option>
                    {resolvedStudentList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <div style={styles.modalActions}>
                    <button type="submit" style={styles.btnPrimary}>Masuk Kelas 🚀</button>
                    <button type="button" style={styles.btnDanger} onClick={() => { setCurrentClass(null); setClassCodeInput(''); setLoginStudentName(''); }}>Ganti Kode Kelas</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleQuickRegisterStudent} style={{display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                  <p style={{margin: 0, fontSize: '12px', color: '#b45309', fontWeight: 'bold'}}>⚠️ Info: Guru belum mengatur nama siswa di absensi kelas ini.</p>
                  <label style={styles.label}>Silakan Ketik Nama Lengkap Anda untuk Mendaftar Langsung:</label>
                  <input type="text" placeholder="Masukkan nama asli Anda..." value={quickStudentName} onChange={(e) => setQuickStudentName(e.target.value)} style={styles.input} required />
                  <div style={styles.modalActions}>
                    <button type="submit" style={styles.btnPrimary}>Daftar & Masuk Kelas 🚀</button>
                    <button type="button" style={styles.btnDanger} onClick={() => { setCurrentClass(null); setClassCodeInput(''); }}>Batalkan</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL GURU ================= */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Otorisasi Akses Guru</h3>
            <div style={styles.infoBox}>
              <b>Petunjuk:</b> Masukkan identitas kelas. Jika kelas belum ada, sistem otomatis membuatkannya. Pastikan <b>KODE KELAS harus UNIK</b> (berisi kombinasi huruf/angka) agar kelas Anda tidak bercampur dengan guru lain.
            </div>
            <form onSubmit={handleRegisterOrLoginGuru} style={styles.form}>
              <label style={styles.label}>Nama Guru:</label>
              <input type="text" placeholder="Contoh: Pak Budi" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} style={styles.input} required />
              <label style={styles.label}>Mata Pelajaran (Nama Kelas):</label>
              <input type="text" placeholder="Contoh: Sosiologi 12 IPA 1" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} style={styles.input} required />
              <label style={styles.label}>Kode / Sandi Kelas (Berikan ini ke Siswa nanti):</label>
              <input type="password" placeholder="Contoh: SOS24A" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Akses / Buat Ruang</button>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowPinModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL MANDIRI ================= */}
      {showMandiriModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Mode Latihan Mandiri</h3>
            <div style={styles.infoBox}>
              <b>Peringatan:</b> Mode ini ditujukan hanya untuk latihan mengecek logika dengan AI. Begitu Anda klik "Keluar", <b>semua data Anda di mode ini akan hangus dan tidak tersimpan.</b>
            </div>
            <form onSubmit={handleMandiriLogin} style={styles.form}>
              <label style={styles.label}>Nama Simulasi (Bebas):</label>
              <input type="text" placeholder="Masukkan nama..." value={mandiriNameInput} onChange={(e) => setMandiriNameInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Mulai Simulasi</button>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowMandiriModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= NAVIGASI DASHBOARD ================= */}
      {userRole && (
        <nav style={styles.navBar} className="no-print">
          {(userRole === 'siswa' || userRole === 'mandiri') && (
            <>
              <span style={styles.navBadge}>{userRole === 'mandiri' ? 'Modus Mandiri' : `Kelas ${currentClass?.subject}`}</span>
              <button style={activeTab === 'introSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('introSiswa')}>1. Instruksi Kerja</button>
              <button style={activeTab === 'apiKey' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>2. Koneksi AI Key</button>
              <button style={activeTab === 'workspace' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>3. Ujian Kanvas</button>
              <button style={activeTab === 'portfolio' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>4. Portofolio & PDF</button>
            </>
          )}
          {userRole === 'guru' && (
            <>
              <span style={styles.navBadge}>📚 {currentClass?.subject} ({currentClass?.teacher})</span>
              <button style={activeTab === 'guruDashboard' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>📊 Laporan Evaluasi Siswa</button>
              <button style={activeTab === 'guruSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruSiswa')}>👥 Kelola Daftar Siswa</button>
            </>
          )}
        </nav>
      )}

      <main style={styles.main}>
        {/* ================= AREA SISWA & MANDIRI ================= */}
        {(userRole === 'siswa' || userRole === 'mandiri') && currentStudent && (
          <>
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>Selamat datang di PENA, {currentStudent.name}! 👋</h2>
                <div style={styles.rulesBox}>
                  <h4 style={{marginTop: 0, color: '#0f172a'}}>Tahapan Pengerjaan Ujian Anda:</h4>
                  <p style={{fontSize: '13px', margin: '0 0 10px 0'}}>Harap ikuti tahapan ini secara berurutan. Jangan melompat ke tab lain sebelum tugas di tab saat ini selesai.</p>
                  <ol style={{lineHeight: '1.8', margin: 0, paddingLeft: '20px', fontSize: '13px'}}>
                    <li><b>Siapkan Argumen (Tab 1):</b> Pastikan Anda sudah memiliki materi/naskah opini yang akan Anda kritik atau pertahankan logikanya.</li>
                    <li><b>Hubungkan Penguji AI (Tab 2):</b> Pergi ke tab "Koneksi AI Key". Anda wajib memasukkan kunci API dari Google Gemini. Mesin AI ini yang akan bertugas menilai tugas Anda secara ketat.</li>
                    <li><b>Kerjakan di Kanvas (Tab 3):</b> Dekonstruksi naskah Anda di sini. Jawab pertanyaan pemantik dengan nalar kritis Anda sendiri. <b>AWAS:</b> Pindah tab atau copy-paste akan langsung merusak nilai integritas Anda.</li>
                    <li><b>Selesai & Unduh Bukti (Tab 4):</b> Setelah dikirim, Anda bisa mengunduh laporan PDF dan menunggu Guru memberikan ACC.</li>
                  </ol>
                </div>
                <button style={{...styles.btnPrimary, marginTop: '15px'}} onClick={() => setActiveTab('apiKey')}>Saya Mengerti, Lanjut Hubungkan AI →</button>
              </div>
            )}

            {activeTab === 'apiKey' && (
              <div style={styles.card} className="no-print">
                <h2 style={{margin: '0 0 10px 0'}}>Integrasi Penguji AI (Google Gemini)</h2>
                <div style={styles.infoBox}>
                  <b>Petunjuk Mendapatkan AI Key Gratis:</b>
                  <ul style={{margin: '5px 0 0 0', paddingLeft: '20px'}}>
                    <li>Buka tab browser baru dan kunjungi: <b>aistudio.google.com/app/apikey</b></li>
                    <li>Login menggunakan akun Google Anda.</li>
                    <li>Klik tombol <b>"Create API Key"</b>.</li>
                    <li>Salin kode panjang yang muncul (berawalan AIza...), lalu tempelkan di kotak bawah ini.</li>
                  </ul>
                </div>
                
                <form onSubmit={checkApiValidity} style={styles.form}>
                  <input type="password" placeholder="Paste kode API Key milikmu di sini..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={styles.input} required />
                  <button type="submit" style={{...styles.btnPrimary, background: '#2563eb'}} disabled={isValidatingApi}>
                    {isValidatingApi ? 'Menghubungkan ke Server Google...' : 'Validasi & Hubungkan Penguji 🔑'}
                  </button>
                </form>
                {isApiValid && <div style={styles.successBadge}>✅ Kunci AI terverifikasi. Mesin AI siap menguji Anda. Silakan lanjut ke tab "3. Ujian Kanvas".</div>}
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                {isWorkspaceLocked ? (
                  <div style={{textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                    <h3 style={{color: '#1e3a8a'}}>Tugas Telah Dikirim dan Terkunci 🔒</h3>
                    <p style={{color: '#475569'}}>AI telah melakukan evaluasi atas naskah Anda.<br/>Silakan berpindah ke tab <b>"4. Portofolio & PDF"</b> untuk melihat hasil analisis atau revisi guru.</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{marginTop: 0, marginBottom: '5px'}}>Kanvas Dekonstruksi Nalar</h2>
                    <p style={{fontSize: '13px', color: '#64748b', marginBottom: '15px'}}>Jawablah dengan argumentasi Anda sendiri. Hindari berpindah tab selama mengerjakan area ini.</p>
                    
                    {!isApiValid && <div style={{background: '#fef2f2', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', borderLeft: '4px solid #ef4444'}}><b>⚠️ Berhenti Dulu!</b> Anda WAJIB mengaktifkan AI Key di tab sebelumnya (Tab 2) agar mesin bisa menilai ujian Anda.</div>}
                    
                    <div style={styles.monitor}>
                      <span>👀 Pelanggaran Pindah Tab: <b style={{color: tabSwitchCount > 0 ? '#dc2626' : '#16a34a'}}>{tabSwitchCount} Kali</b></span>
                      <span>📋 Pelanggaran Copy-Paste: <b style={{color: isPasted ? '#dc2626' : '#16a34a'}}>{isPasted ? 'TERDETEKSI' : 'AMAN'}</b></span>
                    </div>

                    <form onSubmit={handleSubmitCanvas} style={styles.form}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>1. Masukkan Naskah Utama yang Ingin Anda Analisis (Premis):</label>
                        <p style={{fontSize: '11px', color: '#64748b', margin: '2px 0 5px 0'}}>Ini adalah bahan mentah yang akan Anda kritisi. (Boleh teks opini, teori ahli, atau kutipan buku).</p>
                        <textarea rows="3" placeholder="Contoh Naskah: 'Penggunaan kecerdasan buatan merusak kemampuan berpikir kritis siswa karena mereka terbiasa disuapi jawaban instan...'" value={formData.naskahText} onChange={(e) => setFormData({...formData, naskahText: e.target.value})} style={styles.textarea} required />
                      </div>

                      <div style={styles.frameworkGrid}>
                        <div style={styles.frameworkBox}>
                          <label style={styles.label}>Lensa Analisis (Teori Kritis Ennis):</label>
                          <select value={formData.ennisIndicator} onChange={(e) => setFormData({...formData, ennisIndicator: e.target.value})} style={styles.input}>
                            {Object.keys(ennisPrompts).map(k => <option key={k}>{k}</option>)}
                          </select>
                          <div style={styles.promptBox}><b>💡 Pertanyaan Pemantik:</b> {ennisPrompts[formData.ennisIndicator]}</div>
                        </div>
                        <div style={styles.frameworkBox}>
                          <label style={styles.label}>Strategi Pemecahan (Tahap Polya):</label>
                          <select value={formData.polyaStep} onChange={(e) => setFormData({...formData, polyaStep: e.target.value})} style={styles.input}>
                            {Object.keys(polyaPrompts).map(k => <option key={k}>{k}</option>)}
                          </select>
                          <div style={styles.promptBox}><b>💡 Pertanyaan Pemantik:</b> {polyaPrompts[formData.polyaStep]}</div>
                        </div>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>2. Penjabaran Analisis Kritis Anda (Dekonstruksi):</label>
                        <p style={{fontSize: '11px', color: '#64748b', margin: '2px 0 5px 0'}}>Susun argumen Anda dengan menjawab <b>Pertanyaan Pemantik</b> di kotak kuning di atas berdasarkan Naskah Anda. Menjawab ngawur/asal akan ditolak AI.</p>
                        <textarea rows="6" placeholder="Ketik argumen kritis logis Anda secara mandiri di sini..." value={formData.deconstructionText} onChange={(e) => setFormData({...formData, deconstructionText: e.target.value})} onPaste={() => setIsPasted(true)} style={styles.textarea} required />
                      </div>

                      <button type="submit" style={{...styles.btnPrimary, padding: '15px'}} disabled={!isApiValid || isSubmittingTask}>
                        {isSubmittingTask ? '🤖 AI Sedang Menguji Kelogisan Anda...' : 'Kirim Uji Nalar ke Server AI 🚀'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                <div style={{marginBottom: '15px'}} className="no-print">
                  <button style={{...styles.btnPrimary, width: 'auto'}} onClick={() => window.print()}>📄 Cetak / Unduh Laporan (PDF)</button>
                </div>
                {activePortfolio ? (
                  <div id="printArea" style={styles.certBox}>
                    <h2 style={{textAlign: 'center', color: '#1e3a8a', margin: '0 0 5px 0', fontWeight: '900'}}>LAPORAN UJI NALAR AKADEMIK</h2>
                    <p style={{textAlign: 'center', fontSize: '11px', color: '#64748b', margin: '0 0 20px 0'}}>REGISTRASI SISTEM: {activePortfolio.certNumber}</p>
                    
                    <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                      <table style={{width: '100%', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px'}}>
                        <tbody>
                          <tr><td style={{width: '120px', color: '#475569'}}><b>Nama Siswa:</b></td><td>{activePortfolio.studentName}</td></tr>
                          <tr><td style={{color: '#475569'}}><b>Status Validasi:</b></td><td><span style={styles.statusBadge(activePortfolio.status)}>{activePortfolio.status}</span></td></tr>
                          <tr><td style={{color: '#475569'}}><b>Mode & Waktu:</b></td><td>{activePortfolio.mode} | {activePortfolio.timestamp}</td></tr>
                        </tbody>
                      </table>
                      
                      <div style={styles.reviewContentBox}>
                        <b style={{color: '#1e3a8a'}}>A. Naskah/Argumen Mentah yang Dianalisis:</b>
                        <p style={{fontStyle: 'italic', margin: '5px 0 15px 0', padding: '10px', background: '#f1f5f9', borderRadius: '4px'}}>{activePortfolio.naskahText}</p>
                        
                        <b style={{color: '#1e3a8a'}}>B. Dekonstruksi Nalar Siswa ({activePortfolio.ennis} & {activePortfolio.polya}):</b>
                        <p style={{background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', margin: '5px 0', minHeight: '80px'}}>{activePortfolio.deconstructionText}</p>
                      </div>

                      <div style={styles.diagnosticBox}>
                        <b>HASIL PENILAIAN MESIN AI (GEMINI):</b><br/>
                        <p style={{margin: '5px 0 0 0'}}>{activePortfolio.diagnosis}</p>
                      </div>

                      {activePortfolio.teacherFeedback && (
                        <div style={styles.teacherFeedback}>
                          <b>👨‍🏫 CATATAN REVISI / ACC GURU:</b>
                          <p style={{margin: '5px 0 0 0'}}>{activePortfolio.teacherFeedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : <div style={styles.card}><p>Sistem belum mendeteksi tugas yang terselesaikan. Silakan kerjakan ujian di tab "3. Ujian Kanvas".</p></div>}
              </div>
            )}
          </>
        )}

        {/* ================= AREA GURU ================= */}
        {userRole === 'guru' && (
          <>
            {activeTab === 'guruDashboard' && (
              <div style={styles.card} id="printArea">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <div>
                    <h2 style={{margin: '0 0 5px 0'}}>Laporan Evaluasi Kelas</h2>
                    <p style={{fontSize: '12px', color: '#64748b', margin: 0}} className="no-print">Petunjuk: Periksa pekerjaan siswa dan berikan ACC atau Minta Revisi. Siswa tidak bisa mencetak tugas Valid jika belum Anda ACC.</p>
                  </div>
                  <button style={{...styles.btnSecondary, background: '#10b981'}} className="no-print" onClick={() => window.print()}>🖨️ Cetak Rekap Kelas</button>
                </div>

                {submissions.length === 0 ? <p style={{color: '#666', fontSize: '13px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1'}}>Belum ada tugas masuk dari siswa. Minta siswa untuk menyelesaikan ujian mereka menggunakan KODE KELAS Anda.</p> : (
                  <table style={styles.table}>
                    <thead><tr style={{background: '#f1f5f9'}}><th>Nama Siswa</th><th>Status Validasi Guru</th><th className="no-print">Aksi Evaluasi</th></tr></thead>
                    <tbody>
                      {submissions.map(sub => (
                        <tr key={sub.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                          <td><b>{sub.studentName}</b></td>
                          <td><span style={styles.statusBadge(sub.status)}>{sub.status}</span></td>
                          <td className="no-print"><button style={styles.btnTable} onClick={() => setSelectedSubmission(sub)}>👁️ Periksa & Nilai</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px'}}>
                  <div>
                    <h2 style={{margin: '0 0 5px 0'}}>Kelola Daftar Siswa (Absensi)</h2>
                    <p style={{fontSize: '12px', color: '#64748b', margin: 0}}>Petunjuk: Tambahkan nama-nama siswa di kelas ini. Saat siswa login, mereka hanya perlu memilih nama mereka tanpa butuh PIN tambahan.</p>
                  </div>
                  <button style={styles.btnDanger} onClick={handleResetClass}>⚠️ Kosongkan Kelas Total</button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const name = e.target.sName.value.trim();
                  if(name) {
                    const updated = [...students, { id: Date.now(), name }];
                    setStudents(updated);
                    const keys = getStorageKeys(currentClass, 'guru');
                    localStorage.setItem(keys.students, JSON.stringify(updated));
                    e.target.sName.value = ''; 
                  }
                }} style={{display: 'flex', gap: '8px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px'}}>
                  <input name="sName" type="text" placeholder="Ketik nama siswa..." style={{...styles.input, margin: 0, flex: 1}} required />
                  <button type="submit" style={{...styles.btnPrimary, background: '#2563eb', width: 'auto', margin: 0}}>+ Tambahkan ke Daftar</button>
                </form>

                {students.length === 0 ? <p style={{fontSize: '13px', color: '#64748b'}}>Absensi kosong. Jika Anda tidak menambahkan siswa, siswa masih bisa login otomatis dengan mengetik nama mereka sendiri saat masuk.</p> : (
                  <table style={styles.table}>
                    <thead><tr style={{background: '#f1f5f9', textAlign: 'left'}}><th>Nama Siswa di Kelas Ini</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                          <td style={{padding: '12px'}}>{s.name}</td>
                          <td><button style={styles.btnDangerTable} onClick={() => handleDeleteStudent(s.id)}>Keluarkan</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Modal Periksa Kerja Siswa Terperinci */}
            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={{...styles.modalCard, width: '650px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{margin: 0, color: '#1e3a8a'}}>📝 Lembar Penilaian: {selectedSubmission.studentName}</h3>
                    <button style={styles.btnSecondary} onClick={() => setSelectedSubmission(null)}>Tutup</button>
                  </div>
                  <hr style={{margin: '15px 0', borderTop: '2px solid #e2e8f0'}}/>
                  
                  <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                    <div style={styles.reviewContentBox}>
                      <b style={{color: '#0f172a'}}>1. Naskah Mentah Siswa:</b>
                      <p style={{fontStyle: 'italic', margin: '5px 0 15px 0', background: '#e2e8f0', padding: '10px', borderRadius: '4px'}}>{selectedSubmission.naskahText}</p>
                      
                      <b style={{color: '#0f172a'}}>2. Penjabaran Analisis Siswa ({selectedSubmission.ennis} & {selectedSubmission.polya}):</b>
                      <p style={{background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', margin: '5px 0'}}>{selectedSubmission.deconstructionText}</p>
                    </div>

                    <div style={{...styles.diagnosticBox, marginTop: '20px'}}>
                      <b style={{textTransform: 'uppercase'}}>Laporan Integritas & AI:</b><br/>
                      <ul style={{paddingLeft: '20px', margin: '5px 0'}}>
                        <li>Pindah Tab: {selectedSubmission.tabSwitches > 0 ? <span style={{color:'red'}}>Terdeteksi {selectedSubmission.tabSwitches}x</span> : <span style={{color:'green'}}>Aman</span>}</li>
                        <li>Copy-Paste: {selectedSubmission.hasCopyPasted ? <span style={{color:'red'}}>Ya</span> : <span style={{color:'green'}}>Tidak</span>}</li>
                      </ul>
                      <p style={{margin: '10px 0 0 0', fontWeight: 'bold'}}>{selectedSubmission.diagnosis}</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => e.preventDefault()} style={{marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                    <label style={styles.label}>Berikan Catatan Penguji / Guru:</label>
                    <p style={{fontSize: '11px', color: '#64748b', margin: '2px 0 10px 0'}}>Catatan ini akan tercetak di Sertifikat/Laporan milik siswa.</p>
                    <textarea rows="3" placeholder="Tulis masukan, pujian, atau alasan menolak tugas ini..." value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={styles.textarea} />
                    <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                      <button type="button" style={{...styles.btnPrimary, background: '#16a34a', flex: 1}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Disetujui Guru (ACC)')}>✅ ACC TUGAS</button>
                      <button type="button" style={{...styles.btnDanger, padding: '12px', flex: 1}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Minta Revisi')}>❌ MINTA REVISI</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  appContainer: { fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '850px', margin: '30px auto', padding: '20px', color: '#1e293b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #e2e8f0', paddingBottom: '12px', marginBottom: '25px' },
  logoText: { margin: 0, fontSize: '24px', fontWeight: '900', letterSpacing: '1px', color: '#0f172a' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' },
  title: { fontSize: '32px', fontWeight: '900', color: '#1e3a8a', marginBottom: '5px', letterSpacing: '-0.5px' },
  subtitle: { fontSize: '15px', color: '#64748b', marginBottom: '25px', fontWeight: '500' },
  rulesBox: { background: '#f8fafc', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #3b82f6', marginBottom: '25px' },
  infoBox: { background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', marginBottom: '15px', color: '#1e40af' },
  gridMenu: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  menuBox: { flex: 1, minWidth: '220px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '25px 20px', cursor: 'pointer', textAlign: 'center', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'all 0.2s ease-in-out' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' },
  formGroup: { marginBottom: '10px' },
  label: { fontSize: '14px', fontWeight: '700', color: '#334155' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', background: '#f8fafc', transition: 'border 0.2s' },
  textarea: { width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', background: '#f8fafc', lineHeight: '1.5' },
  btnPrimary: { background: '#0f172a', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', width: '100%', fontSize: '15px', letterSpacing: '0.5px' },
  btnSecondary: { background: '#64748b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '15px' },
  btnTable: { background: '#2563eb', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  btnDangerTable: { background: '#ef4444', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  textBtn: { background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 15px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontSize: '14px', fontWeight: '800' },
  backBtn: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: 0, fontWeight: '800' },
  navBar: { display: 'flex', gap: '10px', marginBottom: '25px', alignItems: 'center', flexWrap: 'wrap', background: '#f1f5f9', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  navBadge: { background: '#cbd5e1', padding: '8px 15px', borderRadius: '6px', fontSize: '14px', fontWeight: '800', color: '#0f172a' },
  navBtn: { background: 'transparent', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: '700', color: '#64748b', transition: 'background 0.2s' },
  navActive: { background: '#fff', color: '#2563eb', border: '1px solid #cbd5e1', padding: '8px 15px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalCard: { background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  modalActions: { display: 'flex', gap: '15px', marginTop: '25px', alignItems: 'center' },
  monitor: { background: '#fefce8', border: '1px solid #fef08a', padding: '15px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderRadius: '8px', fontWeight: '500' },
  badgeInfo: { background: '#e0f2fe', color: '#0369a1', padding: '15px', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', border: '1px solid #bae6fd' },
  successBadge: { background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px', fontSize: '14px', marginTop: '15px', fontWeight: '700', border: '1px solid #bbf7d0' },
  frameworkGrid: { display: 'flex', gap: '20px', margin: '20px 0', flexDirection: 'column' },
  frameworkBox: { background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  promptBox: { background: '#fef3c7', color: '#92400e', padding: '10px 15px', borderRadius: '6px', fontSize: '13px', marginTop: '10px', borderLeft: '4px solid #f59e0b' },
  certBox: { border: '4px double #1e3a8a', padding: '40px', background: '#fafaf9', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  reviewContentBox: { background: '#f8fafc', padding: '20px', borderRadius: '8px', marginTop: '20px', border: '1px solid #e2e8f0' },
  diagnosticBox: { background: '#fef2f2', borderLeft: '5px solid #ef4444', padding: '15px', borderRadius: '8px', color: '#991b1b', margin: '20px 0', fontSize: '14px' },
  teacherFeedback: { background: '#eff6ff', borderLeft: '5px solid #3b82f6', padding: '15px', borderRadius: '8px', color: '#1e40af', margin: '15px 0', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginTop: '20px' },
  statusBadge: (status) => ({
    background: status?.includes('ACC') ? '#dcfce7' : status?.includes('Revisi') ? '#fee2e2' : '#fef3c7',
    color: status?.includes('ACC') ? '#166534' : status?.includes('Revisi') ? '#991b1b' : '#92400e',
    padding: '6px 12px', borderRadius: '6px', fontWeight: '800', fontSize: '12px', display: 'inline-block'
  }),
  main: { marginTop: '15px' }
};
