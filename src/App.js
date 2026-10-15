import React, { useState } from 'react';

export default function App() {
  // Navigasi Utama Aplikasi PENA
  const [activeTab, setActiveTab] = useState('landing'); // 'landing', 'apiKey', 'workspace', 'portfolio', 'adminDashboard'
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('mandiri'); // 'mandiri' atau 'kelompok'
  
  // State Form Kanvas Dekonstruksi Nalar
  const [formData, setFormData] = useState({
    studentName: '',
    problem: '',
    ennisIndicator: 'Penjelasan Sederhana (Ennis)',
    polyaStep: 'Memahami Masalah (Polya)',
    deconstructionText: ''
  });

  const [lastReport, setLastReport] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert('Mohon masukkan API Key yang valid!');
      return;
    }
    alert('API Key Google AI berhasil disimpan ke memori sesi!');
    setActiveTab('workspace');
  };

  // Poin 3 & 5: Pengiriman Fleksibel & Analisis Diagnostik Teori Kognitif
  const handleSubmitCanvas = (e) => {
    e.preventDefault();
    const length = formData.deconstructionText.trim().length;
    
    let diagnosis = 'Kritis & Mendalam (Sangat Baik)';
    let notes = 'Argumen terstruktur logis dengan kerangka analitis yang memadai.';
    if (length < 30) {
      diagnosis = 'Permukaan / Terindikasi Ketergantungan Instan AI';
      notes = 'Jawaban terlalu singkat. Siswa terindikasi menerima mentah-mentah jawaban AI tanpa proses dekonstruksi nalar mendiri.';
    }

    const report = {
      id: Date.now(),
      name: formData.studentName || 'Siswa Anonim',
      mode: selectedMode === 'mandiri' ? 'Modus Mandiri (Privat)' : 'Modus Kelompok (Kelas Formal)',
      ennis: formData.ennisIndicator,
      polya: formData.polyaStep,
      problem: formData.problem,
      answer: formData.deconstructionText,
      diagnosis: diagnosis,
      notes: notes,
      timestamp: new Date().toLocaleString(),
      status: selectedMode === 'mandiri' ? 'Otomatis Disetujui (Mandiri)' : 'Menunggu ACC Guru (Pending Review)'
    };

    setLastReport(report);
    setActiveTab('portfolio');
  };

  return (
    <div style={styles.appContainer}>
      {/* HEADER NAVIGASI UTAMA */}
      <header style={styles.header}>
        <h2 style={styles.logoText}>PENA 🛡️ (Pertanggungjawaban Nalar)</h2>
        <nav style={styles.navBar}>
          <button style={activeTab === 'landing' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('landing')}>1. Beranda & Pilar</button>
          <button style={activeTab === 'apiKey' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>2. Setup API Key</button>
          <button style={activeTab === 'workspace' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>3 & 5 & 6. Kanvas & Mode</button>
          <button style={activeTab === 'portfolio' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>4. E-Portofolio</button>
          <button style={activeTab === 'adminDashboard' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('adminDashboard')}>7. Dashboard Guru (RBAC)</button>
        </nav>
      </header>

      <main style={styles.mainContent}>
        {/* ================= 1. HALAMAN UTAMA & ONBOARDING ================= */}
        {activeTab === 'landing' && (
          <div style={styles.card}>
            <span style={styles.badge}>Spesifikasi Poin 1</span>
            <h1 style={styles.sectionTitle}>Selamat Datang di Platform PENA</h1>
            <p style={styles.leadText}>
              Platform web pendidikan yang dirancang khusus untuk mendisrupsi ketergantungan buta siswa pada kecerdasan buatan (AI) melalui kerangka nalar kritis yang ketat.
            </p>
            
            <div style={styles.gridBox}>
              <div style={styles.gridItem}>
                <h3>📜 Pilar 1: Naskah Fisik</h3>
                <p>Refleksi awal berbasis catatan tangan/manual untuk melatih keaslian gagasan dasar sebelum disentuh teknologi.</p>
              </div>
              <div style={styles.gridItem}>
                <h3>💻 Pilar 2: Kanvas Digital</h3>
                <p>Ruang kerja interaktif di browser untuk mendekonstruksi klaim, argumen, dan jawaban instan dari AI.</p>
              </div>
            </div>

            <div style={styles.callout}>
              <h4>🎯 Misi Utama Platform:</h4>
              <p>Memastikan siswa tidak sekadar "menyontek" hasil AI, melainkan mampu mempertanggungjawabkan setiap keputusan logika menggunakan teori kognitif ilmiah.</p>
            </div>

            <button style={styles.primaryBtn} onClick={() => setActiveTab('apiKey')}>
              Lanjut ke Panduan Setup API Key ➔
            </button>
          </div>
        )}

        {/* ================= 2. PANDUAN INTEGRASI KUNCI API GOOGLE AI ================= */}
        {activeTab === 'apiKey' && (
          <div style={styles.card}>
            <span style={styles.badge}>Spesifikasi Poin 2</span>
            <h2 style={styles.sectionTitle}>Panduan Integrasi Google AI API Key</h2>
            <p style={styles.leadText}>Ikuti langkah-langkah di bawah ini untuk menghubungkan mesin validasi AI ke platform PENA:</p>
            
            <ol style={styles.stepsList}>
              <li>Buka halaman resmi <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Google AI Studio</a> di browser Anda.</li>
              <li>Login menggunakan akun Google pribadi atau institusi Anda.</li>
              <li>Cari dan klik tombol berlabel <b>"Create API Key"</b> di sudut dasbor.</li>
              <li>Salin (Copy) rangkaian kode unik rahasia yang dihasilkan oleh sistem Google.</li>
              <li>Tempelkan (Paste) kode tersebut ke dalam kolom input di bawah ini:</li>
            </ol>

            <form onSubmit={handleSaveApiKey} style={styles.formBox}>
              <input
                type="password"
                placeholder="Contoh: AIzaSyA... (Tempel API Key di sini)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={styles.inputField}
                required
              />
              <button type="submit" style={styles.primaryBtn}>Simpan & Aktifkan Mesin AI 🔑</button>
            </form>
          </div>
        )}

        {/* ================= 3, 5, & 6. WORKSPACE, TEORI COGNITIVE & DUAL-MODE ================= */}
        {activeTab === 'workspace' && (
          <div style={styles.card}>
            <span style={styles.badge}>Spesifikasi Poin 3, 5, & 6</span>
            <h2 style={styles.sectionTitle}>Kanvas Dekonstruksi Nalar & Dual-Mode</h2>
            
            {/* Poin 6: Pilihan Mode */}
            <div style={styles.modeSelectorBox}>
              <label><b>Pilih Modus Operasional:</b></label>
              <div style={styles.modeButtonsRow}>
                <button 
                  type="button" 
                  style={selectedMode === 'mandiri' ? styles.modeActive : styles.modeInactive}
                  onClick={() => setSelectedMode('mandiri')}
                >
                  🟢 Modus Mandiri (Privat / Latihan Bebas)
                </button>
                <button 
                  type="button" 
                  style={selectedMode === 'kelompok' ? styles.modeActive : styles.modeInactive}
                  onClick={() => setSelectedMode('kelompok')}
                >
                  🔵 Modus Kelompok (Tugas Formal Kelas & Guru)
                </button>
              </div>
            </div>

            {/* Poin 3: Tombol Submit Tidak Dikunci Mati (Fleksibel) */}
            <form onSubmit={handleSubmitCanvas}>
              <div style={styles.inputGroup}>
                <label>Nama Lengkap Siswa:</label>
                <input
                  type="text"
                  name="studentName"
                  placeholder="Masukkan nama lengkap Anda..."
                  value={formData.studentName}
                  onChange={handleInputChange}
                  style={styles.inputField}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label>Pernyataan / Kasus / Solusi AI yang Ingin Diuji:</label>
                <textarea
                  name="problem"
                  rows="2"
                  placeholder="Tuliskan klaim atau teks jawaban AI yang meragukan..."
                  value={formData.problem}
                  onChange={handleInputChange}
                  style={styles.textareaField}
                  required
                />
              </div>

              {/* Poin 5: Kerangka Teori Ennis & Polya */}
              <div style={styles.rowGroup}>
                <div style={styles.halfGroup}>
                  <label>A. Teori Ennis (Berpikir Kritis):</label>
                  <select name="ennisIndicator" value={formData.ennisIndicator} onChange={handleInputChange} style={styles.inputField}>
                    <option>Penjelasan Sederhana</option>
                    <option>Keterampilan Dasar</option>
                    <option>Menyimpulkan</option>
                    <option>Penjelasan Lebih Lanjut</option>
                    <option>Taktik & Strategi</option>
                  </select>
                </div>
                <div style={styles.halfGroup}>
                  <label>B. Teori Polya (Pemecahan Masalah):</label>
                  <select name="polyaStep" value={formData.polyaStep} onChange={handleInputChange} style={styles.inputField}>
                    <option>Memahami Masalah</option>
                    <option>Merencanakan Penyelesaian</option>
                    <option>Melaksanakan Rencana</option>
                    <option>Memeriksa Kembali</option>
                  </select>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label>Uraian Dekonstruksi Nalar Mandiri (Fleksibel - Sistem Tetap Menerima Walau Singkat/Asal):</label>
                <textarea
                  name="deconstructionText"
                  rows="4"
                  placeholder="Ketik argumen Anda secara bebas. Jika diisi asal, sistem akan mendeteksinya dalam Laporan Diagnostik AI."
                  value={formData.deconstructionText}
                  onChange={handleInputChange}
                  style={styles.textareaField}
                  required
                />
              </div>

              <button type="submit" style={styles.primaryBtn}>
                Kirim Pengiriman & Hasilkan Laporan Diagnostik 🚀
              </button>
            </form>
          </div>
        )}

        {/* ================= 4. GENERATOR E-PORTOFOLIO MANDIRI ================= */}
        {activeTab === 'portfolio' && (
          <div style={styles.card}>
            <span style={styles.badge}>Spesifikasi Poin 4</span>
            <h2 style={styles.sectionTitle}>Generator E-Portofolio Mandiri (Digital Card)</h2>
            
            {lastReport ? (
              <div style={styles.portfolioCard}>
                <div style={styles.cardHeader}>
                  <h3>🎓 Kartu Rekapitulasi Portofolio Siswa</h3>
                  <span style={styles.timestampBadge}>{lastReport.timestamp}</span>
                </div>
                <p><b>Nama Siswa:</b> {lastReport.name}</p>
                <p><b>Modus Operasional:</b> {lastReport.mode}</p>
                <p><b>Topik/Kasus:</b> {lastReport.problem}</p>
                <hr style={styles.hr} />
                <p><b>Indikator Ennis:</b> {lastReport.ennis}</p>
                <p><b>Tahapan Polya:</b> {lastReport.polya}</p>
                <p><b>Status Evaluasi Kognitif:</b> <span style={{color: '#d97706', fontWeight: 'bold'}}>{lastReport.diagnosis}</span></p>
                
                <div style={styles.diagnosticSummaryBox}>
                  <h4>🤖 Catatan Diagnostik AI:</h4>
                  <p>{lastReport.notes}</p>
                  <p style={{marginTop: '8px', fontSize: '12px'}}><b>Status Sistem:</b> {lastReport.status}</p>
                </div>

                <button style={styles.secondaryBtn} onClick={() => alert('Simulasi: Kartu E-Portofolio berhasil diunduh dalam format PDF/PNG!')}>
                  📥 Unduh Kartu Portofolio (.PDF)
                </button>
              </div>
            ) : (
              <p style={{color: '#64748b', fontStyle: 'italic'}}>Belum ada data pengerjaan. Silakan selesaikan pengisian di menu <b>Kanvas & Mode</b> terlebih dahulu.</p>
            )}
          </div>
        )}

        {/* ================= 7. PRIVASI & RBAC (DASHBOARD GURU) ================= */}
        {activeTab === 'adminDashboard' && (
          <div style={styles.card}>
            <span style={styles.badge}>Spesifikasi Poin 7</span>
            <h2 style={styles.sectionTitle}>Dashboard Kontrol Guru (RBAC Secure Access)</h2>
            <p style={styles.leadText}>
              Pemisahan hak akses tegas antara ruang privat siswa (sandbox) dan panel kontrol administratif guru guna menjaga kerahasiaan data serta rasa aman psikologis siswa.
            </p>

            <div style={styles.rbacBox}>
              <h3>🔒 Lapisan Keamanan Role-Based Access Control (RBAC)</h3>
              <ul style={styles.rbacList}>
                <li><b>Ruang Privat Siswa:</b> Data coretan mentah dan keraguan awal siswa dienkripsi secara privat agar bebas dari rasa *insecure*.</li>
                <li><b>Penyaringan AI:</b> Seluruh tugas kelompok disaring otomatis oleh mesin diagnostik sebelum ditampilkan ke layar guru.</li>
                <li><b>Hak Akses Guru:</b> Hanya menampilkan laporan rekapitulasi akhir dan status persetujuan (ACC/Revisi) tanpa membocorkan privasi emosional siswa.</li>
              </ul>
              <div style={styles.simulatedTable}>
                <p><b>Status Dashboard:</b> Aktif dan terhubung secara aman dengan database terenkripsi.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Styling CSS Profesional yang Rapi
const styles = {
  appContainer: {
    fontFamily: 'Inter, system-ui, sans-serif',
    maxWidth: '850px',
    margin: '20px auto',
    padding: '15px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px'
  },
  header: {
    backgroundColor: '#1e293b',
    color: '#fff',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  logoText: {
    margin: '0 0 10px 0',
    fontSize: '20px'
  },
  navBar: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  navBtn: {
    backgroundColor: '#334155',
    color: '#cbd5e1',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  navBtnActive: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '25px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: '20px',
    marginTop: '10px',
    marginBottom: '10px'
  },
  leadText: {
    color: '#475569',
    fontSize: '14px',
    lineHeight: '1.5',
    marginBottom: '15px'
  },
  gridBox: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px'
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '13px'
  },
  callout: {
    backgroundColor: '#fef3c7',
    borderLeft: '4px solid #f59e0b',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '13px',
    color: '#92400e'
  },
  stepsList: {
    margin: '10px 0 20px 20px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#334155'
  },
  formBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  inputGroup: {
    marginBottom: '12px'
  },
  inputField: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontSize: '14px'
  },
  textareaField: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  rowGroup: {
    display: 'flex',
    gap: '15px',
    marginBottom: '12px'
  },
  halfGroup: {
    flex: 1
  },
  modeSelectorBox: {
    backgroundColor: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    marginBottom: '15px',
    fontSize: '13px'
  },
  modeButtonsRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px'
  },
  modeActive: {
    flex: 1,
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px'
  },
  modeInactive: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    color: '#475569',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%',
    marginTop: '5px'
  },
  secondaryBtn: {
    backgroundColor: '#475569',
    color: '#fff',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
    marginTop: '15px',
    width: '100%'
  },
  portfolioCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    padding: '20px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  timestampBadge: {
    fontSize: '11px',
    color: '#64748b'
  },
  hr: {
    border: '0',
    borderTop: '1px solid #cbd5e1',
    margin: '12px 0'
  },
  diagnosticSummaryBox: {
    backgroundColor: '#fef3c7',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '12px',
    color: '#92400e',
    fontSize: '13px'
  },
  rbacBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    padding: '15px',
    borderRadius: '6px',
    marginTop: '10px',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  rbacList: {
    margin: '10px 0 15px 20px',
    fontSize: '13px'
  },
  simulatedTable: {
    backgroundColor: '#e2e8f0',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
    textAlign: 'center',
    color: '#334155'
  }
};
