import React, { useState } from 'react';

export default function App() {
  // State RBAC Peran Pengguna ('siswa' atau 'guru')
  const [userRole, setUserRole] = useState('siswa'); 
  const [activeTab, setActiveTab] = useState('landing'); // 'landing', 'apiKey', 'workspace', 'portfolio', 'guruDashboard'
  
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('mandiri');

  // State Form Kanvas
  const [formData, setFormData] = useState({
    studentName: '',
    problem: '',
    ennisIndicator: 'Penjelasan Sederhana',
    polyaStep: 'Memahami Masalah',
    deconstructionText: ''
  });

  // State Database Lokal (Menyimpan Seluruh Pengiriman Siswa)
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      studentName: 'Budi Santoso',
      mode: 'Modus Kelompok (Kelas)',
      problem: 'Apakah AI bisa menggantikan peran guru sepenuhnya?',
      ennis: 'Penjelasan Sederhana',
      polya: 'Memahami Masalah',
      deconstructionText: 'AI hanya memproses pola data tanpa memiliki empati kognitif.',
      diagnosis: 'Kritis & Mendalam',
      aiNotes: 'Argumentasi siswa logis dan relevan dengan teori kognitif.',
      timestamp: '15/10/2026, 14:30',
      status: 'Pending Review'
    }
  ]);

  const [activePortfolio, setActivePortfolio] = useState(null);

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

  // Poin 3 & 5: Pengiriman Fleksibel & Diagnostik AI
  const handleSubmitCanvas = (e) => {
    e.preventDefault();
    const length = formData.deconstructionText.trim().length;

    let diagnosis = 'Kritis & Mendalam';
    let aiNotes = 'Penguraian nalar siswa terstruktur rapi berdasarkan indikator Ennis & Polya.';

    if (length < 25) {
      diagnosis = 'Permukaan / Terindikasi Instan (Ketergantungan AI)';
      aiNotes = 'Jawaban terlalu singkat. Siswa terindikasi menyalin mentah jawaban AI tanpa proses dekonstruksi mandiri.';
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
      status: selectedMode === 'mandiri' ? 'Disetujui Otomatis (Mandiri)' : 'Pending Review'
    };

    setSubmissions([newSubmission, ...submissions]);
    setActivePortfolio(newSubmission);
    setActiveTab('portfolio');
  };

  // Poin 7: Fungsi Aksi Guru (ACC / Tolak)
  const handleTeacherAction = (id, newStatus) => {
    setSubmissions(prev =>
      prev.map(item => item.id === id ? { ...item, status: newStatus } : item)
    );
  };

  // Poin 4: Unduh File Portofolio Beneran (Bukan Alert Scam!)
  const downloadPortfolioFile = () => {
    if (!activePortfolio) return;
    const content = `
=== KARTU E-PORTOFOLIO DIGITAL PENA ===
Nama Siswa     : ${activePortfolio.studentName}
Modus          : ${activePortfolio.mode}
Waktu          : ${activePortfolio.timestamp}
Status Verifikasi: ${activePortfolio.status}

[ANALISIS COGNITIVE FRAMEWORK]
- Teori Ennis  : ${activePortfolio.ennis}
- Teori Polya  : ${activePortfolio.polya}

[KASUS / KLAYM AI]
${activePortfolio.problem}

[DEKONSTRUKSI NALAR SISWA]
${activePortfolio.deconstructionText}

[LAPORAN DIAGNOSTIK AI]
Status Nalar   : ${activePortfolio.diagnosis}
Catatan Evaluasi: ${activePortfolio.aiNotes}
=======================================
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
      {/* HEADER & SWITCH ROLE (RBAC CONTROL) */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.logoText}>PENA 🛡️ (Pertanggungjawaban Nalar)</h2>
          <span style={styles.roleBadge}>
            Peran Saat Ini: <b>{userRole === 'siswa' ? '🎓 Siswa' : '👨‍🏫 Guru / Pengajar'}</b>
          </span>
        </div>

        {/* Tombol Ganti Peran RBAC */}
        <button 
          style={styles.switchRoleBtn}
          onClick={() => {
            const nextRole = userRole === 'siswa' ? 'guru' : 'siswa';
            setUserRole(nextRole);
            if (nextRole === 'guru') setActiveTab('guruDashboard');
            else setActiveTab('landing');
          }}
        >
          🔄 Ganti Peran ke {userRole === 'siswa' ? 'Guru' : 'Siswa'}
        </button>
      </header>

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
            📊 Dashboard Kontrol Guru (RBAC Active)
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
              <div style={styles.portfolioPrintCard} id="printableCard">
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
                <p><b>Jawaban Dekonstruksi:</b> "{activePortfolio.deconstructionText}"</p>
                
                <div style={styles.diagnosticResult}>
                  <h4>🤖 Laporan Diagnostik AI:</h4>
                  <p><b>Status Nalar:</b> {activePortfolio.diagnosis}</p>
                  <p><b>Catatan Evaluasi:</b> {activePortfolio.aiNotes}</p>
                </div>

                {/* DUA TOMBOL AKSI CETAK / DOWNLOAD BENERAN */}
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
        {activeTab === 'guruDashboard' && userRole === 'guru' && (
          <div style={styles.card}>
            <span style={styles.badge}>Poin 7: RBAC Guru Dashboard</span>
            <h2>Panel Kontrol Administratif Guru</h2>
            <p style={{fontSize: '13px', color: '#475569'}}>
              Hak akses khusus guru untuk meninjau hasil latihan siswa, memvalidasi laporan diagnostik AI, dan memberikan persetujuan (ACC/Revisi).
            </p>

            <table style={styles.table}>
              <thead>
                <tr style={{backgroundColor: '#e2e8f0', textAlign: 'left'}}>
                  <th style={styles.th}>Siswa</th>
                  <th style={styles.th}>Modus</th>
                  <th style={styles.th}>Diagnostik AI</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Aksi Guru</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={styles.td}><b>{sub.studentName}</b></td>
                    <td style={styles.td}>{sub.mode}</td>
                    <td style={styles.td}>
                      <span style={{fontSize: '12px', color: sub.diagnosis.includes('Permukaan') ? 'red' : 'green'}}>
                        {sub.diagnosis}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{fontSize: '11px', padding: '3px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e'}}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.accBtn} onClick={() => handleTeacherAction(sub.id, 'Disetujui Guru (ACC)')}>
                        ✅ ACC
                      </button>
                      <button style={styles.rejectBtn} onClick={() => handleTeacherAction(sub.id, 'Minta Revisi')}>
                        ❌ Revisi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// Styling CSS
const styles = {
  appContainer: { fontFamily: 'sans-serif', maxWidth: '800px', margin: '20px auto', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', color: 'white', padding: '15px', borderRadius: '8px' },
  logoText: { margin: 0, fontSize: '18px' },
  roleBadge: { fontSize: '12px', color: '#93c5fd' },
  switchRoleBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  navBar: { display: 'flex', gap: '8px', margin: '15px 0' },
  navBtn: { backgroundColor: '#cbd5e1', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  navBtnActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  mainContent: { marginTop: '10px' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  badge: { backgroundColor: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  title: { fontSize: '20px', margin: '10px 0' },
  paragraph: { fontSize: '14px', color: '#475569' },
  primaryBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '10px' },
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
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '12px' },
  th: { padding: '8px', borderBottom: '2px solid #cbd5e1' },
  td: { padding: '8px' },
  accBtn: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', marginRight: '4px', fontSize: '10px' },
  rejectBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }
};
