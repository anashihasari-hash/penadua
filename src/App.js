import React, { useState } from 'react';

export default function App() {
  // State RBAC & Otentikasi
  const [userRole, setUserRole] = useState('siswa'); // 'siswa' atau 'guru'
  const [isGuruAuthed, setIsGuruAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  const [activeTab, setActiveTab] = useState('landing');
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('mandiri');

  // State Form Kanvas Siswa
  const [formData, setFormData] = useState({
    studentName: '',
    problem: '',
    ennisIndicator: 'Penjelasan Sederhana',
    polyaStep: 'Memahami Masalah',
    deconstructionText: ''
  });

  // Database Simulasi Terintegrasi
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      studentName: 'Budi Santoso',
      mode: 'Modus Kelompok (Kelas)',
      problem: 'Apakah AI dapat menggantikan peran penalaran kritis manusia secara penuh dalam karya ilmiah?',
      ennis: 'Penjelasan Sederhana',
      polya: 'Memahami Masalah',
      deconstructionText: 'AI hanya memproses dataset teks berdasarkan probabilitas statistik tanpa memiliki kesadaran emosional, pertimbangan etis, maupun konteks nalar kritis mandiri.',
      diagnosis: 'Kritis & Mendalam',
      aiNotes: 'Penguraian nalar siswa sangat terstruktur, logis, dan mampu mengidentifikasi limitasi substantif AI.',
      timestamp: '15/10/2026, 14:30',
      status: 'Pending Review',
      teacherFeedback: ''
    },
    {
      id: 2,
      studentName: 'Siti Rahma',
      mode: 'Modus Kelompok (Kelas)',
      problem: 'AI adalah jawaban mutlak untuk menyelesaikan semua masalah matematika tanpa perlu koreksi.',
      ennis: 'Menyimpulkan',
      polya: 'Merencanakan Penyelesaian',
      deconstructionText: 'AI langsung kasih rumus cepat jadi saya tinggal salin tempel saja.',
      diagnosis: 'Permukaan / Terindikasi Instan (Ketergantungan AI)',
      aiNotes: 'Jawaban sangat dangkal. Siswa tidak melakukan dekonstruksi langkah penyelesaian sama sekali.',
      timestamp: '15/10/2026, 15:00',
      status: 'Pending Review',
      teacherFeedback: ''
    }
  ]);

  const [activePortfolio, setActivePortfolio] = useState(null);

  // State Modal Detail Peninjauan Guru
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [targetSubmissionId, setTargetSubmissionId] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  // Handle Minta Akses Guru
  const handleRequestGuruAccess = () => {
    if (userRole === 'guru') {
      setUserRole('siswa');
      setActiveTab('landing');
      return;
    }
    setShowPinModal(true);
  };

  // Verifikasi PIN Rahasia Guru
  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (pinInput === 'PENA2026' || pinInput === '1234') {
      setIsGuruAuthed(true);
      setUserRole('guru');
      setShowPinModal(false);
      setPinInput('');
      setActiveTab('guruDashboard');
    } else {
      alert('❌ PIN Rahasia Guru Salah! Akses Ditolak.');
      setPinInput('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert('Masukkan API Key yang valid!');
      return;
    }
    alert('API Key Google AI Berhasil Diaktifkan!');
    setActiveTab('workspace');
  };

  // Submit Kanvas Siswa
  const handleSubmitCanvas = (e) => {
    e.preventDefault();
    const length = formData.deconstructionText.trim().length;

    let diagnosis = 'Kritis & Mendalam';
    let aiNotes = 'Penguraian nalar siswa terstruktur rapi berdasarkan indikator Ennis & Polya.';

    if (length < 30) {
      diagnosis = 'Permukaan / Terindikasi Instan (Ketergantungan AI)';
      aiNotes = 'Jawaban terlalu singkat. Siswa terindikasi menyalin mentah jawaban AI tanpa analisis mendalam.';
    }

    const newSubmission = {
      id: Date.now(),
      studentName: formData.studentName || 'Siswa Tanpa Nama',
      mode: selectedMode === 'mandiri' ? 'Modus Mandiri (Privat)' : 'Modus Kelompok (Kelas)',
      problem: formData.problem,
      ennis: formData.ennisIndicator,
      polya: formData.polyaStep,
      deconstructionText: formData.deconstructionText,
      diagnosis: diagnosis,
      aiNotes: aiNotes,
      timestamp: new Date().toLocaleString(),
      status: selectedMode === 'mandiri' ? 'Disetujui Otomatis (Mandiri)' : 'Pending Review',
      teacherFeedback: ''
    };

    setSubmissions([newSubmission, ...submissions]);
    setActivePortfolio(newSubmission);
    setActiveTab('portfolio');
  };

  // Guru Memberikan ACC
  const handleApproveByTeacher = (id) => {
    const defaultFeedback = 'Bagus! Pertanggungjawaban nalar sudah tepat dan memenuhi kaidah berpikir kritis.';
    setSubmissions(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'Disetujui Guru (ACC)', teacherFeedback: defaultFeedback } : item)
    );
    if (selectedSubmission && selectedSubmission.id === id) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Disetujui Guru (ACC)', teacherFeedback: defaultFeedback }));
    }
    alert('✅ Tugas siswa berhasil disetujui (ACC)!');
  };

  // Buka Modal Input Catatan Revisi oleh Guru
  const handleOpenRevisionModal = (id) => {
    setTargetSubmissionId(id);
    setTeacherNoteInput('');
    setShowRevisionModal(true);
  };

  // Simpan Catatan Revisi Guru
  const handleSaveRevision = (e) => {
    e.preventDefault();
    if (!teacherNoteInput.trim()) {
      alert('Mohon tuliskan alasan/catatan revisi agar siswa tahu bagian mana yang harus diperbaiki!');
      return;
    }

    setSubmissions(prev =>
      prev.map(item =>
        item.id === targetSubmissionId
          ? { ...item, status: 'Minta Revisi', teacherFeedback: teacherNoteInput }
          : item
      )
    );

    if (selectedSubmission && selectedSubmission.id === targetSubmissionId) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Minta Revisi', teacherFeedback: teacherNoteInput }));
    }

    setShowRevisionModal(false);
    setTeacherNoteInput('');
    alert('❌ Status diperbarui menjadi Minta Revisi. Catatan evaluasi telah terikirim ke siswa.');
  };

  // Unduh Sertifikat/Kartu Portofolio Teks
  const downloadPortfolioFile = () => {
    if (!activePortfolio) return;
    const content = `
=====================================================
          KARTU E-PORTOFOLIO DIGITAL PENA
=====================================================
Nama Siswa       : ${activePortfolio.studentName}
Modus Pengerjaan : ${activePortfolio.mode}
Waktu Pengerjaan : ${activePortfolio.timestamp}
Status Validasi  : ${activePortfolio.status}

-----------------------------------------------------
1. KERANGKA TEORI KOGNITIF
-----------------------------------------------------
- Indikator Ennis (Berpikir Kritis) : ${activePortfolio.ennis}
- Tahapan Polya (Pemecahan Masalah) : ${activePortfolio.polya}

-----------------------------------------------------
2. KASUS / KLAIM AI YANG DIUJI
-----------------------------------------------------
${activePortfolio.problem}

-----------------------------------------------------
3. DEKONSTRUKSI NALAR SISWA
-----------------------------------------------------
${activePortfolio.deconstructionText}

-----------------------------------------------------
4. LAPORAN DIAGNOSTIK AI
-----------------------------------------------------
- Status Nalar      : ${activePortfolio.diagnosis}
- Catatan Diagnostik: ${activePortfolio.aiNotes}

-----------------------------------------------------
5. EVALUASI & CATATAN GURU
-----------------------------------------------------
Catatan Guru: ${activePortfolio.teacherFeedback || '(Belum ada catatan)'}
=====================================================
    `;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `E-Portofolio_${activePortfolio.studentName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.appContainer}>
      {/* HEADER & SWITCH ROLE (RBAC CONTROL WITH PIN) */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.logoText}>PENA 🛡️ (Pertanggungjawaban Nalar)</h2>
          <span style={styles.roleBadge}>
            Peran Saat Ini: <b>{userRole === 'siswa' ? '🎓 Siswa (Privat Sandbox)' : '👨‍🏫 Guru (Akses Terverifikasi)'}</b>
          </span>
        </div>

        <button 
          style={userRole === 'guru' ? styles.guruActiveBtn : styles.switchRoleBtn}
          onClick={handleRequestGuruAccess}
        >
          {userRole === 'siswa' ? '🔒 Masuk Mode Guru' : '🔓 Keluar dari Mode Guru'}
        </button>
      </header>

      {/* MODAL VERIFIKASI PIN RAHASIA GURU */}
      {showPinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3>🔐 Otentikasi Khusus Guru</h3>
            <p style={{fontSize: '13px', color: '#64748b'}}>
              Akses ke Dashboard Guru dilindungi otentikasi. Masukkan PIN Rahasia Guru untuk melanjutkan.
            </p>
            <form onSubmit={handleVerifyPin}>
              <input
                type="password"
                placeholder="Masukkan PIN Rahasia Guru..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={styles.input}
                autoFocus
                required
              />
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" style={styles.primaryBtn}>Verifikasi PIN 🔑</button>
                <button 
                  type="button" 
                  style={styles.cancelBtn} 
                  onClick={() => { setShowPinModal(false); setPinInput(''); }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI BERDASARKAN PERAN */}
      <nav style={styles.navBar}>
        {userRole === 'siswa' ? (
          <>
            <button style={activeTab === 'landing' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('landing')}>1. Beranda</button>
            <button style={activeTab === 'apiKey' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>2. API Key</button>
            <button style={activeTab === 'workspace' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>3,5,6. Kanvas Nalar</button>
            <button style={activeTab === 'portfolio' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>4. E-Portofolio</button>
          </>
        ) : (
          <button style={activeTab === 'guruDashboard' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>
            📊 Dashboard Kontrol Guru (Akses Terverifikasi RBAC)
          </button>
        )}
      </nav>

      <main style={styles.mainContent}>
        {/* ================= 1. HALAMAN UTAMA ================= */}
        {activeTab === 'landing' && userRole === 'siswa' && (
          <div style={styles.card}>
            <span style={styles.badge}>Poin 1: Landing Page</span>
            <h1 style={styles.title}>Disrupsi Ketergantungan AI dengan Nalar</h1>
            <p style={styles.paragraph}>
              Platform PENA memfasilitasi transisi dari naskah fisik (Pilar 1) menuju kanvas digital (Pilar 2) untuk memastikan setiap jawaban dipertanggungjawabkan secara kritis.
            </p>
            <button style={styles.primaryBtn} onClick={() => setActiveTab('apiKey')}>
              Mulai Setup API Key Google AI ➔
            </button>
          </div>
        )}

        {/* ================= 2. SETUP API KEY ================= */}
        {activeTab === 'apiKey' && userRole === 'siswa' && (
          <div style={styles.card}>
            <span style={styles.badge}>Poin 2: Guide API Key</span>
            <h2>Pengaturan Google AI Studio</h2>
            <ol style={styles.list}>
              <li>Buka <b>aistudio.google.com</b>.</li>
              <li>Klik tombol <b>Create API Key</b>.</li>
              <li>Salin kode unik API Anda.</li>
              <li>Tempelkan ke dalam kolom di bawah ini:</li>
            </ol>
            <form onSubmit={handleSaveApiKey}>
              <input
                type="password"
                placeholder="Tempel API Key di sini..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={styles.input}
                required
              />
              <button type="submit" style={styles.primaryBtn}>Simpan & Aktifkan 🔑</button>
            </form>
          </div>
        )}

        {/* ================= 3, 5, & 6. KANVAS & DUAL MODE ================= */}
        {activeTab === 'workspace' && userRole === 'siswa' && (
          <div style={styles.card}>
            <span style={styles.badge}>Poin 3, 5, 6: WorkSpace</span>
            <h2>Kanvas Dekonstruksi Nalar</h2>

            <div style={styles.modeBox}>
              <label><b>Pilih Modus Operasional:</b></label>
              <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
                <button 
                  type="button" 
                  style={selectedMode === 'mandiri' ? styles.modeActive : styles.modeInactive}
                  onClick={() => setSelectedMode('mandiri')}
                >
                  🟢 Modus Mandiri (Privat / Latihan)
                </button>
                <button 
                  type="button" 
                  style={selectedMode === 'kelompok' ? styles.modeActive : styles.modeInactive}
                  onClick={() => setSelectedMode('kelompok')}
                >
                  🔵 Modus Kelompok (Tugas Kelas Guru)
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitCanvas}>
              <div style={styles.formGroup}>
                <label>Nama Siswa:</label>
                <input type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} style={styles.input} required />
              </div>

              <div style={styles.formGroup}>
                <label>Klaim / Kasus AI yang Diuji:</label>
                <textarea name="problem" rows="2" value={formData.problem} onChange={handleInputChange} style={styles.textarea} required />
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                  <label>A. Teori Ennis (Kritis):</label>
                  <select name="ennisIndicator" value={formData.ennisIndicator} onChange={handleInputChange} style={styles.input}>
                    <option>Penjelasan Sederhana</option>
                    <option>Keterampilan Dasar</option>
                    <option>Menyimpulkan</option>
                    <option>Penjelasan Lebih Lanjut</option>
                    <option>Taktik & Strategi</option>
                  </select>
                </div>
                <div style={{flex: 1}}>
                  <label>B. Teori Polya (Masalah):</label>
                  <select name="polyaStep" value={formData.polyaStep} onChange={handleInputChange} style={styles.input}>
                    <option>Memahami Masalah</option>
                    <option>Merencanakan Penyelesaian</option>
                    <option>Melaksanakan Rencana</option>
                    <option>Memeriksa Kembali</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>Dekonstruksi Nalar Mandiri (Sistem Tetap Menerima Meskipun Singkat/Keliru):</label>
                <textarea name="deconstructionText" rows="4" value={formData.deconstructionText} onChange={handleInputChange} style={styles.textarea} required />
              </div>

              <button type="submit" style={styles.primaryBtn}>Kirim & Hasilkan E-Portofolio 🚀</button>
            </form>
          </div>
        )}

        {/* ================= 4. E-PORTOFOLIO DIGITAL REAL ================= */}
        {activeTab === 'portfolio' && userRole === 'siswa' && (
          <div style={styles.card}>
            <span style={styles.badge}>Poin 4: Generator Portofolio</span>
            <h2>Kartu E-Portofolio Digital Siswa</h2>

            {activePortfolio ? (
              <div style={styles.portfolioPrintCard}>
                <div style={styles.cardHeader}>
                  <h3>🎓 KARTU VERIFIKASI NALAR SISWA</h3>
                  <span style={{fontSize: '12px', color: '#64748b'}}>{activePortfolio.timestamp}</span>
                </div>
                <hr />
                <p><b>Nama Siswa:</b> {activePortfolio.studentName}</p>
                <p><b>Modus:</b> {activePortfolio.mode}</p>
                <p><b>Status Verifikasi:</b> <span style={styles.statusBadge}>{activePortfolio.status}</span></p>
                <hr />
                <p><b>Indikator Ennis:</b> {activePortfolio.ennis}</p>
                <p><b>Tahapan Polya:</b> {activePortfolio.polya}</p>
                <p><b>Kasus AI:</b> {activePortfolio.problem}</p>
                <p><b>Jawaban Dekonstruksi Siswa:</b> "{activePortfolio.deconstructionText}"</p>
                
                <div style={styles.diagnosticResult}>
                  <h4>🤖 Laporan Diagnostik AI:</h4>
                  <p><b>Status Nalar:</b> {activePortfolio.diagnosis}</p>
                  <p><b>Catatan Evaluasi AI:</b> {activePortfolio.aiNotes}</p>
                </div>

                {/* TAMPILAN CATATAN REVISI DARI GURU JIKA ADA */}
                {activePortfolio.teacherFeedback && (
                  <div style={styles.teacherFeedbackBox}>
                    <h4>👨‍🏫 Catatan / Alasan Revisi dari Guru:</h4>
                    <p>"{activePortfolio.teacherFeedback}"</p>
                  </div>
                )}

                <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                  <button style={styles.secondaryBtn} onClick={() => window.print()}>
                    🖨️ Cetak / Simpan PDF (Print)
                  </button>
                  <button style={styles.downloadBtn} onClick={downloadPortfolioFile}>
                    📄 Unduh File Sertifikat (.TXT)
                  </button>
                </div>
              </div>
            ) : (
              <p>Belum ada data portofolio. Silakan isi Kanvas terlebih dahulu.</p>
            )}
          </div>
        )}

        {/* ================= 7. DASHBOARD KONTROL GURU (RBAC) ================= */}
        {activeTab === 'guruDashboard' && userRole === 'guru' && isGuruAuthed && (
          <div style={styles.card}>
            <span style={styles.badge}>Poin 7: RBAC Guru Dashboard</span>
            <h2>Panel Kontrol Administratif Guru</h2>
            <p style={{fontSize: '13px', color: '#475569'}}>
              Hak akses khusus guru untuk meninjau detail penguraian nalar siswa, mengevaluasi laporan diagnostik AI, dan memberikan masukan revisi.
            </p>

            <table style={styles.table}>
              <thead>
                <tr style={{backgroundColor: '#e2e8f0', textAlign: 'left'}}>
                  <th style={styles.th}>Siswa</th>
                  <th style={styles.th}>Modus</th>
                  <th style={styles.th}>Diagnostik AI</th>
                  <th style={styles.th}>Status Validasi</th>
                  <th style={styles.th}>Aksi Peninjauan Guru</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={styles.td}><b>{sub.studentName}</b></td>
                    <td style={styles.td}>{sub.mode}</td>
                    <td style={styles.td}>
                      <span style={{fontSize: '12px', fontWeight: 'bold', color: sub.diagnosis.includes('Permukaan') ? '#dc2626' : '#16a34a'}}>
                        {sub.diagnosis}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        fontSize: '11px', 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontWeight: 'bold',
                        backgroundColor: sub.status.includes('ACC') ? '#dcfce7' : sub.status.includes('Revisi') ? '#fee2e2' : '#fef3c7',
                        color: sub.status.includes('ACC') ? '#15803d' : sub.status.includes('Revisi') ? '#b91c1c' : '#b45309'
                      }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.inspectBtn} onClick={() => setSelectedSubmission(sub)}>
                        👁️ Periksa Jawaban
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL PERIKSA JAWABAN SISWA LENGKAP OLEH GURU */}
        {selectedSubmission && (
          <div style={styles.modalOverlay}>
            <div style={styles.largeModalCard}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>📝 Peninjauan Nalar Siswa: {selectedSubmission.studentName}</h3>
                <button style={styles.closeBtn} onClick={() => setSelectedSubmission(null)}>✖ Close</button>
              </div>
              <hr />
              <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                <p><b>Waktu Pengerjaan:</b> {selectedSubmission.timestamp}</p>
                <p><b>Modus Operasional:</b> {selectedSubmission.mode}</p>
                <p><b>Indikator Ennis:</b> {selectedSubmission.ennis} | <b>Tahapan Polya:</b> {selectedSubmission.polya}</p>
                
                <div style={styles.reviewContentBox}>
                  <b>Klaim / Kasus AI yang Diuji:</b>
                  <p style={{fontStyle: 'italic', color: '#334155'}}>{selectedSubmission.problem}</p>
                  
                  <b>Jawaban Dekonstruksi Nalar Siswa:</b>
                  <p style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1'}}>
                    "{selectedSubmission.deconstructionText}"
                  </p>
                </div>

                <div style={styles.diagnosticResult}>
                  <b>🤖 Laporan Diagnostik AI:</b>
                  <p><b>Status:</b> {selectedSubmission.diagnosis}</p>
                  <p><b>Catatan Evaluasi:</b> {selectedSubmission.aiNotes}</p>
                </div>

                {selectedSubmission.teacherFeedback && (
                  <div style={styles.teacherFeedbackBox}>
                    <b>👨‍🏫 Catatan Guru yang Tersimpan:</b>
                    <p>"{selectedSubmission.teacherFeedback}"</p>
                  </div>
                )}
              </div>

              {/* TOMBOL AKSI GURU SETELAH MEMBACA JAWABAN */}
              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button 
                  style={styles.accBtnLarge} 
                  onClick={() => handleApproveByTeacher(selectedSubmission.id)}
                >
                  ✅ Setujui / ACC Jawaban
                </button>
                <button 
                  style={styles.rejectBtnLarge} 
                  onClick={() => handleOpenRevisionModal(selectedSubmission.id)}
                >
                  ❌ Minta Revisi + Tulis Catatan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL INPUT CATATAN REVISI GURU */}
        {showRevisionModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h3>✏️ Tulis Alasan / Catatan Revisi</h3>
              <p style={{fontSize: '12px', color: '#64748b'}}>
                Berikan masukan konstruktif agar siswa memahami letak kelemahan nalar mereka.
              </p>
              <form onSubmit={handleSaveRevision}>
                <textarea
                  rows="4"
                  placeholder="Contoh: Penjelasan bagian indikator Ennis masih terlalu umum. Harap perjelas kembali argumen penolakan klaim AI..."
                  value={teacherNoteInput}
                  onChange={(e) => setTeacherNoteInput(e.target.value)}
                  style={styles.textarea}
                  required
                />
                <div style={{display: 'flex', gap: '10px'}}>
                  <button type="submit" style={styles.rejectBtnLarge}>Kirim Catatan Revisi 📩</button>
                  <button 
                    type="button" 
                    style={styles.cancelBtn} 
                    onClick={() => setShowRevisionModal(false)}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// CSS Styling
const styles = {
  appContainer: { fontFamily: 'sans-serif', maxWidth: '850px', margin: '20px auto', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', color: 'white', padding: '15px', borderRadius: '8px' },
  logoText: { margin: 0, fontSize: '18px' },
  roleBadge: { fontSize: '12px', color: '#93c5fd' },
  switchRoleBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  guruActiveBtn: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', maxWidth: '450px', width: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  largeModalCard: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  closeBtn: { backgroundColor: '#e2e8f0', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#94a3b8', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  navBar: { display: 'flex', gap: '8px', margin: '15px 0' },
  navBtn: { backgroundColor: '#cbd5e1', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  navBtnActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  mainContent: { marginTop: '10px' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  badge: { backgroundColor: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  title: { fontSize: '20px', margin: '10px 0' },
  paragraph: { fontSize: '14px', color: '#475569' },
  primaryBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, marginTop: '10px' },
  secondaryBtn: { backgroundColor: '#475569', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', flex: 1, fontSize: '12px', fontWeight: 'bold' },
  downloadBtn: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', flex: 1, fontSize: '12px', fontWeight: 'bold' },
  input: { width: '100%', padding: '8px', margin: '8px 0 15px 0', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px', margin: '8px 0 15px 0', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' },
  list: { fontSize: '13px', lineHeight: '1.6' },
  formGroup: { marginBottom: '10px' },
  modeBox: { backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '6px', marginBottom: '15px' },
  modeActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  modeInactive: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' },
  portfolioPrintCard: { backgroundColor: '#f8fafc', border: '2px solid #cbd5e1', padding: '15px', borderRadius: '8px', marginTop: '10px', fontSize: '13px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' },
  diagnosticResult: { backgroundColor: '#fef3c7', padding: '10px', borderRadius: '6px', marginTop: '10px', color: '#92400e' },
  teacherFeedbackBox: { backgroundColor: '#fee2e2', padding: '10px', borderRadius: '6px', marginTop: '10px', color: '#991b1b', borderLeft: '4px solid #dc2626' },
  reviewContentBox: { backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', marginTop: '10px', marginBottom: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '12px' },
  th: { padding: '8px', borderBottom: '2px solid #cbd5e1' },
  td: { padding: '8px' },
  inspectBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  accBtnLarge: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 'bold' },
  rejectBtnLarge: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }
};
