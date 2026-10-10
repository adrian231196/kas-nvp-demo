/* NVP Operasional — contoh aplikasi operasional & alur kas PT Nuri Vira Pratama.
   Peran: Teknisi, Manager Operasional, Direktur. Data contoh, tersimpan di perangkat. */
const { useState, useEffect, useRef } = React;

// ================================================================== konstanta
const STORE_KEY = 'nvp_ops_demo_v1';
const ROLES = { teknisi: 'Teknisi', manager: 'Manager Operasional', direktur: 'Direktur' };
const USERS = [
  { id: 't1', name: 'Budi Santoso', role: 'teknisi' },
  { id: 't2', name: 'Joko Prasetyo', role: 'teknisi' },
  { id: 'm1', name: 'Rina Marlina', role: 'manager' },
  { id: 'd1', name: 'Bapak Direktur', role: 'direktur' },
];
// Daftar type & berat APAR (bisa disesuaikan dengan produk yang dijual)
const TYPE_APAR = ['Powder (Dry Chemical ABC)', 'CO2 (Karbon Dioksida)', 'Foam AFFF', 'Clean Agent / Liquid Gas (HCFC-123)', 'Air (Water Mist)', 'Wet Chemical (Kelas K)'];
const BERAT_APAR = ['1 kg', '2 kg', '3 kg', '3,5 kg', '4,5 kg', '5 kg', '6 kg', '6,8 kg', '9 kg', '12 kg', '25 kg (troli)', '50 kg (troli)', '70 kg (troli)'];
const OPSI = {
  tekanan: ['Normal', 'Kurang', 'Lebih'],
  selang: ['Baik', 'Retak/bocor', 'Tidak ada'],
  handle: ['Baik', 'Rusak'],
  pin: ['Ada & tersegel', 'Hilang/rusak'],
};
const JENIS_BIAYA = {
  Operasional: ['Gaji & upah karyawan', 'Transportasi & BBM', 'Pengiriman / ekspedisi', 'ATK & perlengkapan kantor', 'Perawatan & perbaikan', 'Konsumsi & jamuan', 'Lain-lain'],
  HPP: ['Pembelian tabung APAR', 'Pembelian media pemadam (powder/CO2/foam)', 'Sparepart & aksesoris', 'Jasa uji / sertifikasi pihak ketiga', 'Lain-lain'],
};
const ST_TUGAS = { baru: ['Tugas baru', 'amber'], dikerjakan: ['Dikerjakan', 'blue'], selesai: ['Selesai', 'green'] };
const ST_AJU = { cek_manager: ['Diperiksa Manager', 'amber'], menunggu_direktur: ['Menunggu pembayaran', 'blue'], dibayar: ['Dibayar', 'green'], dikembalikan: ['Dikembalikan', 'rose'], ditolak: ['Ditolak', 'slate'] };
const TONE = {
  amber: 'bg-amber-50 text-amber-800 border-amber-200', rose: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200', violet: 'bg-violet-50 text-violet-700 border-violet-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200', slate: 'bg-slate-100 text-slate-600 border-slate-200',
};
const COMPANY = { name: 'PT NURI VIRA PRATAMA', brand: 'Viopran Fire Extinguisher', address: 'Jakarta', phone: '0856-7725-758' };

// ================================================================== util
const fmt = (n) => 'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayStr = () => ymd(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const addMonths = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setMonth(d.getMonth() + n); return ymd(d); };
const nowIso = () => new Date().toISOString();
const fmtTime = (iso) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDate = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtBulan = (s) => s ? new Date(s + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '—';
const userById = (id) => USERS.find(u => u.id === id) || { name: '?', role: 'teknisi' };
const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const uid = () => Math.random().toString(36).slice(2, 10);

function nextNo(seq, kind, date) {
  const y = (date || todayStr()).slice(0, 4);
  const n = ((seq[kind] || {})[y] || 0) + 1;
  return { no: `${String(n).padStart(4, '0')}/${kind}/NVP/${y}`, seq: { ...seq, [kind]: { ...(seq[kind] || {}), [y]: n } } };
}

const unitTerisi = (u) => !!(u.tekanan && u.kedaluwarsa && u.selang && u.handle && u.pin);
const unitLayak = (u) => unitTerisi(u) && u.tekanan === 'Normal' && u.kedaluwarsa >= todayStr() && u.selang !== 'Retak/bocor' && u.handle === 'Baik' && u.pin === 'Ada & tersegel';
const progres = (t) => { const n = t.units.length; const d = t.units.filter(unitTerisi).length; return { n, d, pct: n ? Math.round(d / n * 100) : 0 }; };
function buatUnit(rows) {
  const out = [];
  rows.forEach(r => { for (let i = 0; i < (Number(r.jumlah) || 0); i++) out.push({ no: out.length + 1, lokasi: '', type: r.type, berat: r.berat, tekanan: '', kedaluwarsa: '', selang: '', handle: '', pin: '', ket: '', foto: [] }); });
  return out;
}

function resizeImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve({ name: file.name, dataUrl: c.toDataURL('image/jpeg', 0.6) });
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

// ================================================================== data contoh
function seedState() {
  const t = todayStr(), y = t.slice(0, 4);
  const h = (by, action, note, mins) => ({ t: new Date(Date.now() - mins * 60000).toISOString(), by, action, note: note || '' });
  const isi = (u, i, cocok) => ({ ...u, lokasi: ['Lobi', 'Gudang A', 'Gudang B', 'Dapur', 'Ruang panel', 'Parkir', 'Lantai 2', 'Pos satpam'][i % 8], tekanan: cocok ? 'Normal' : 'Kurang', kedaluwarsa: addMonths(t, cocok ? 10 : -1), selang: 'Baik', handle: 'Baik', pin: cocok ? 'Ada & tersegel' : 'Hilang/rusak', ket: cocok ? '' : 'Perlu isi ulang' });

  const u1 = buatUnit([{ type: TYPE_APAR[0], berat: '6 kg', jumlah: 12 }, { type: TYPE_APAR[1], berat: '5 kg', jumlah: 4 }]).map((u, i) => i < 6 ? isi(u, i, i !== 4) : u);
  const u3 = buatUnit([{ type: TYPE_APAR[0], berat: '3 kg', jumlah: 4 }]).map((u, i) => isi(u, i, i !== 2));
  const tugas = [
    { id: `0003/TP/NVP/${y}`, tempat: 'Gudang Sinar Abadi', alamat: 'Cakung, Jakarta Timur', tglMulai: addDays(t, 1), tglSelesai: addDays(t, 2), jumlah: 5, type: TYPE_APAR[0], berat: '3 kg', teknisiIds: ['t1', 't2'], status: 'baru', catatan: 'Bawa manometer cadangan',
      units: buatUnit([{ type: TYPE_APAR[0], berat: '3 kg', jumlah: 5 }]), dibuatOleh: 'm1', history: [h('m1', 'Tugas dibuat', '', 90)] },
    { id: `0002/TP/NVP/${y}`, tempat: 'PT Maju Jaya Logistik', alamat: 'Pulogadung, Jakarta Timur', tglMulai: addDays(t, -1), tglSelesai: addDays(t, 1), jumlah: 16, type: TYPE_APAR[0], berat: '6 kg', teknisiIds: ['t1'], status: 'dikerjakan', sumber: `0001/PKJ/NVP/${y}`, catatan: '',
      units: u1, dibuatOleh: 'm1', history: [h('m1', 'Tugas dibuat dari pekerjaan refilling', '', 2900), h('t1', 'Tugas diterima', '', 1500)] },
    { id: `0001/TP/NVP/${y}`, tempat: 'Kantor Kecamatan Duren Sawit', alamat: 'Duren Sawit, Jakarta Timur', tglMulai: addDays(t, -9), tglSelesai: addDays(t, -8), jumlah: 4, type: TYPE_APAR[0], berat: '3 kg', teknisiIds: ['t2'], status: 'selesai', catatan: '',
      units: u3, dibuatOleh: 'm1', selesaiAt: new Date(Date.now() - 8 * 86400000).toISOString(), history: [h('m1', 'Tugas dibuat', '', 14000), h('t2', 'Tugas diterima', '', 13000), h('t2', 'Pemeriksaan selesai, laporan PDF dibuat', '3 layak, 1 tidak layak', 11500)] },
  ];
  const pekerjaan = [
    { id: `0002/PKJ/NVP/${y}`, tanggal: addDays(t, -1), jenis: 'Pengadaan', konsumen: 'RS Sehat Sentosa', alamat: 'Bekasi', rows: [{ type: TYPE_APAR[0], berat: '3 kg', jumlah: 8 }, { type: TYPE_APAR[3], berat: '2 kg', jumlah: 2 }], foto: [], teknisiId: 't2', createdAt: new Date(Date.now() - 20 * 3600000).toISOString(), taskId: null },
    { id: `0001/PKJ/NVP/${y}`, tanggal: addDays(t, -3), jenis: 'Refilling', konsumen: 'PT Maju Jaya Logistik', alamat: 'Pulogadung, Jakarta Timur', rows: [{ type: TYPE_APAR[0], berat: '6 kg', jumlah: 12 }, { type: TYPE_APAR[1], berat: '5 kg', jumlah: 4 }], foto: [], teknisiId: 't1', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), taskId: `0002/TP/NVP/${y}` },
  ];
  const bln = addMonths(t, -1).slice(0, 7);
  const aju = [
    { id: `0004/PGJ/NVP/${y}`, jenis: 'gaji', pemohonId: 't1', periode: bln, keperluan: `Gaji ${fmtBulan(bln)}`, kategori: 'Operasional', jenisBiaya: 'Gaji & upah karyawan',
      rincian: [{ desc: 'Gaji pokok (26 hari)', jumlah: 3900000 }, { desc: 'Lembur 6 jam', jumlah: 270000 }, { desc: 'Uang makan & transport', jumlah: 520000 }], bank: 'BRI', rekening: '0987654321', atasNama: 'Budi Santoso', status: 'cek_manager', lampiran: [], createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), history: [h('t1', 'Mengajukan gaji', '', 300)] },
    { id: `0003/PGJ/NVP/${y}`, jenis: 'gaji', pemohonId: 't2', periode: bln, keperluan: `Gaji ${fmtBulan(bln)}`, kategori: 'Operasional', jenisBiaya: 'Gaji & upah karyawan',
      rincian: [{ desc: 'Gaji pokok (26 hari)', jumlah: 3900000 }, { desc: 'Uang makan & transport', jumlah: 520000 }], bank: 'BCA', rekening: '5550009999', atasNama: 'Joko Prasetyo', status: 'menunggu_direktur', lampiran: [], createdAt: new Date(Date.now() - 30 * 3600000).toISOString(), history: [h('t2', 'Mengajukan gaji', '', 1800), h('m1', 'Diperiksa Manager, diteruskan ke Direktur', 'Absensi sesuai', 1200)] },
    { id: `0002/PGJ/NVP/${y}`, jenis: 'pembayaran', pemohonId: 'm1', keperluan: 'Pembelian 20 tabung APAR 6 kg untuk stok', kategori: 'HPP', jenisBiaya: 'Pembelian tabung APAR',
      rincian: [{ desc: 'Tabung APAR powder 6 kg × 20', jumlah: 7700000 }], bank: 'BCA', rekening: '1234567890', atasNama: 'CV Sinar Proteksi', status: 'menunggu_direktur', lampiran: [], createdAt: new Date(Date.now() - 50 * 3600000).toISOString(), history: [h('m1', 'Mengajukan pembayaran', '', 3000)] },
    { id: `0001/PGJ/NVP/${y}`, jenis: 'pembayaran', pemohonId: 'm1', keperluan: 'Isi ulang media CO2 40 kg', kategori: 'HPP', jenisBiaya: 'Pembelian media pemadam (powder/CO2/foam)',
      rincian: [{ desc: 'Isi ulang CO2 per kg × 40', jumlah: 880000 }], bank: 'Mandiri', rekening: '1300011122233', atasNama: 'PT Gas Andalan', status: 'dibayar', lampiran: [], createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      bayar: { tgl: addDays(t, -6), metode: 'Transfer bank', ref: 'IB-771200', bukti: [] }, kasKeluarId: 'KK-0001', history: [h('m1', 'Mengajukan pembayaran', '', 10080), h('d1', 'Dibayar Direktur', 'Ref IB-771200', 8900)] },
  ].map(a => ({ ...a, total: sum(a.rincian, r => r.jumlah) }));
  const kasKeluar = [{ id: 'KK-0001', tgl: addDays(t, -6), deskripsi: 'Isi ulang media CO2 40 kg — PT Gas Andalan', kategori: 'HPP', jenisBiaya: 'Pembelian media pemadam (powder/CO2/foam)', nominal: 880000, ref: 'IB-771200', pengajuanId: `0001/PGJ/NVP/${y}`, sinkron: true }];
  return {
    tugas, pekerjaan, aju, kasKeluar, notifs: [],
    seq: { TP: { [y]: 3 }, PKJ: { [y]: 2 }, PGJ: { [y]: 4 }, KK: 1 },
    settings: { userId: null, notifRoles: ['direktur'] },
  };
}
function loadState() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && Array.isArray(s.tugas)) return s; } catch (e) {}
  return seedState();
}

// ================================================================== notifikasi HP
async function systemNotify(title, body, link) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const opt = { body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: (link || '') + '|' + title, data: { url: './#/' + (link || '') }, vibrate: [120, 60, 120] };
    const reg = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(title, opt); else new Notification(title, opt);
    return true;
  } catch (e) { return false; }
}

// ================================================================== ikon & komponen kecil
const Ico = ({ d, size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{d}</svg>
);
const I = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  clip: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12l2 2 4-4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>,
  back: <><path d="M15 18l-6-6 6-6" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  x: <><path d="M18 6 6 18M6 6l12 12" /></>,
  cam: <><path d="M4 7h3l2-3h6l2 3h3v13H4z" /><circle cx="12" cy="13" r="4" /></>,
  folder: <><path d="M3 6h6l2 2h10v11H3z" /></>,
  file: <><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></>,
  wrench: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></>,
  send: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" /></>,
  cash: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>,
};
const Badge = ({ map, status }) => { const s = map[status] || ['?', 'slate']; return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${TONE[s[1]]}`}>{s[0]}</span>; };
const Kosong = ({ teks }) => <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-sm text-slate-500">{teks}</div>;
const Seksi = ({ judul, children, aksi }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-4">
    <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{judul}</h3>{aksi}</div>
    {children}
  </section>
);
const Baris = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-slate-100 last:border-0"><span className="text-slate-500 shrink-0">{k}</span><span className="text-right font-semibold break-words min-w-0">{v}</span></div>;
const Bar = ({ pct, tone = 'bg-red-600' }) => <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className={`h-2 rounded-full ${pct === 100 ? 'bg-emerald-500' : tone}`} style={{ width: `${pct}%` }}></div></div>;
const Kembali = ({ onClick, teks = 'Kembali' }) => <button onClick={onClick} className="flex items-center gap-1 text-sm font-bold text-slate-500"><Ico d={I.back} size={18} /> {teks}</button>;
const inp = 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500';
const Lab = ({ t, hint, children }) => <label className="block"><span className="text-xs font-bold text-slate-600">{t}</span>{hint && <span className="text-[11px] text-slate-400"> — {hint}</span>}<div className="mt-1">{children}</div></label>;
const btnUtama = 'w-full py-3.5 rounded-2xl bg-red-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-40';
const btnGaris = 'w-full py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-sm';

function Segmen({ value, options, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = value === o, buruk = !['Normal', 'Baik', 'Ada & tersegel'].includes(o);
        return <button key={o} type="button" onClick={() => onChange(o)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${on ? (buruk ? 'bg-rose-600 text-white border-rose-600' : 'bg-emerald-600 text-white border-emerald-600') : 'bg-white text-slate-600 border-slate-200'}`}>{o}</button>;
      })}
    </div>
  );
}

function FotoInput({ label, list, setList, max = 6 }) {
  const ref = useRef(null);
  const pilih = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    const hasil = [];
    for (const f of files.slice(0, max)) { try { hasil.push(await resizeImage(f)); } catch (err) {} }
    setList([...list, ...hasil].slice(0, max));
  };
  return (
    <div>
      <div className="text-xs font-bold text-slate-600 mb-1.5">{label} <span className="font-medium text-slate-400">(maks. {max} foto)</span></div>
      <div className="grid grid-cols-4 gap-2">
        {list.map((a, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
            <img src={a.dataUrl} alt={a.name} className="w-full h-full object-cover" />
            <button type="button" aria-label="Hapus foto" onClick={() => setList(list.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><Ico d={I.x} size={14} /></button>
          </div>
        ))}
        {list.length < max && <button type="button" onClick={() => ref.current && ref.current.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 text-slate-500 flex flex-col items-center justify-center text-[11px] font-bold"><Ico d={I.cam} />Foto</button>}
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={pilih} />
    </div>
  );
}

function BarisApar({ rows, setRows }) {
  const set = (i, k, v) => setRows(rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i} className="bg-slate-50 rounded-xl p-2.5 space-y-2">
          <div className="flex gap-2">
            <select aria-label={`Type APAR ${i + 1}`} value={r.type} onChange={(e) => set(i, 'type', e.target.value)} className={inp}><option value="">— Type APAR —</option>{TYPE_APAR.map(t => <option key={t}>{t}</option>)}</select>
            {rows.length > 1 && <button type="button" aria-label="Hapus baris" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-2 text-slate-400"><Ico d={I.trash} size={18} /></button>}
          </div>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <select aria-label={`Berat ${i + 1}`} value={r.berat} onChange={(e) => set(i, 'berat', e.target.value)} className={inp}><option value="">— Berat —</option>{BERAT_APAR.map(b => <option key={b}>{b}</option>)}</select>
            <input aria-label={`Jumlah ${i + 1}`} type="number" inputMode="numeric" min="1" value={r.jumlah} onChange={(e) => set(i, 'jumlah', e.target.value)} placeholder="Jumlah" className={inp} />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, { type: '', berat: '', jumlah: '' }])} className="text-sm font-bold text-red-600">+ Tambah type/berat lain</button>
    </div>
  );
}

// ================================================================== App
function App() {
  const [st, setSt] = useState(loadState);
  const [view, setView] = useState({ name: 'home' });
  const [laporan, setLaporan] = useState(null);
  const [toast, setToast] = useState('');
  const [installEvt, setInstallEvt] = useState(null);
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const me = st.settings.userId ? userById(st.settings.userId) : null;

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) { setToast('Penyimpanan perangkat penuh — kurangi foto.'); } }, [st]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const openHash = () => {
      const m = /^#\/(tugas|aju|pekerjaan)\/(.+)$/.exec(location.hash);
      if (m) setView({ name: m[1], id: decodeURIComponent(m[2]) });
    };
    openHash();
    window.addEventListener('hashchange', openHash);
    const onMsg = (e) => { if (e.data && e.data.open) { const h = e.data.open.replace(/^.*#/, '#'); if (location.hash !== h) location.hash = h; else openHash(); } };
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', onMsg);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('hashchange', openHash); if (navigator.serviceWorker) navigator.serviceWorker.removeEventListener('message', onMsg); };
  }, []);

  const go = (name, extra) => { setView({ name, ...(extra || {}) }); if (location.hash) history.replaceState(null, '', location.pathname); window.scrollTo(0, 0); };

  // ---- update state + notifikasi (in-app & HP)
  const ubah = (fn, pesan) => {
    setSt(prev => {
      const d = JSON.parse(JSON.stringify(prev));
      const n = fn(d) || [];
      const baru = n.map(x => ({ id: uid(), t: nowIso(), read: false, ...x }));
      d.notifs = [...baru, ...(d.notifs || [])].slice(0, 200);
      baru.forEach(x => {
        const untukPerangkat = d.settings.notifRoles.includes(x.toRole);
        const bukanDiriSendiri = !me || me.role !== x.toRole;
        if (untukPerangkat && bukanDiriSendiri) systemNotify(x.title, x.body, x.link);
      });
      return d;
    });
    if (pesan) setToast(pesan);
  };
  const log = (obj, action, note) => { obj.history = [...(obj.history || []), { t: nowIso(), by: me.id, action, note: note || '' }]; };

  // ---------------- aksi: pekerjaan refilling/pengadaan (Teknisi)
  const simpanPekerjaan = (f) => ubah(d => {
    const r = nextNo(d.seq, 'PKJ', f.tanggal); d.seq = r.seq;
    const p = { ...f, id: r.no, teknisiId: me.id, createdAt: nowIso(), taskId: null };
    d.pekerjaan.unshift(p);
    setTimeout(() => go('pekerjaan', { id: r.no }), 0);
    const jml = sum(f.rows, x => x.jumlah);
    return [{ toRole: 'manager', title: `Pekerjaan ${f.jenis.toLowerCase()} baru`, body: `${f.konsumen} · ${jml} APAR — siap dijadwalkan pemeriksaan`, link: 'pekerjaan/' + r.no }];
  }, 'Pekerjaan tersimpan & dokumentasi masuk arsip');

  // ---------------- aksi: tugas pemeriksaan
  const simpanTugas = (f) => ubah(d => {
    const r = nextNo(d.seq, 'TP', f.tglMulai); d.seq = r.seq;
    const t = { ...f, id: r.no, status: 'baru', dibuatOleh: me.id, history: [{ t: nowIso(), by: me.id, action: f.sumber ? 'Tugas dibuat dari ' + f.sumber : 'Tugas dibuat', note: '' }] };
    d.tugas.unshift(t);
    if (f.sumber) { const p = d.pekerjaan.find(x => x.id === f.sumber); if (p) p.taskId = r.no; }
    setTimeout(() => go('tugas', { id: r.no }), 0);
    return f.teknisiIds.map(tid => ({ toRole: 'teknisi', toUser: tid, title: 'Tugas pemeriksaan baru', body: `${f.tempat} · ${f.jumlah} APAR · ${fmtDate(f.tglMulai)}`, link: 'tugas/' + r.no }));
  }, 'Tugas dikirim ke teknisi');
  const terimaTugas = (id) => ubah(d => { const t = d.tugas.find(x => x.id === id); t.status = 'dikerjakan'; log(t, 'Tugas diterima'); return [{ toRole: 'manager', title: 'Tugas diterima', body: `${me.name}: ${t.tempat}`, link: 'tugas/' + id }]; }, 'Tugas diterima');
  const simpanUnit = (id, idx, unit) => ubah(d => { const t = d.tugas.find(x => x.id === id); t.units[idx] = unit; t.lastBy = me.id; return []; });
  const selesaiTugas = (id) => ubah(d => {
    const t = d.tugas.find(x => x.id === id); t.status = 'selesai'; t.selesaiAt = nowIso();
    const lay = t.units.filter(unitLayak).length;
    log(t, 'Pemeriksaan selesai, laporan PDF dibuat', `${lay} layak, ${t.units.length - lay} tidak layak`);
    const body = `${t.tempat}: ${lay} layak, ${t.units.length - lay} tidak layak — PDF tersimpan di arsip`;
    return [{ toRole: 'manager', title: 'Pemeriksaan selesai', body, link: 'tugas/' + id }, { toRole: 'direktur', title: 'Pemeriksaan selesai', body, link: 'tugas/' + id }];
  }, 'Laporan PDF dibuat & masuk arsip');

  // ---------------- aksi: pengajuan gaji / pembayaran
  const simpanAju = (f, editId) => ubah(d => {
    const total = sum(f.rincian, r => r.jumlah);
    if (editId) {
      const a = d.aju.find(x => x.id === editId);
      Object.assign(a, f, { total, status: me.role === 'teknisi' ? 'cek_manager' : 'menunggu_direktur' }); log(a, 'Direvisi & diajukan ulang');
      setTimeout(() => go('aju', { id: editId }), 0);
      return [me.role === 'teknisi' ? { toRole: 'manager', title: 'Revisi pengajuan gaji', body: `${me.name} · ${fmt(total)}`, link: 'aju/' + editId } : { toRole: 'direktur', title: 'Revisi pengajuan pembayaran', body: `${a.keperluan} · ${fmt(total)}`, link: 'aju/' + editId }];
    }
    const r = nextNo(d.seq, 'PGJ', todayStr()); d.seq = r.seq;
    const a = { ...f, id: r.no, total, pemohonId: me.id, createdAt: nowIso(), status: me.role === 'teknisi' ? 'cek_manager' : 'menunggu_direktur', history: [{ t: nowIso(), by: me.id, action: f.jenis === 'gaji' ? 'Mengajukan gaji' : 'Mengajukan pembayaran', note: '' }] };
    d.aju.unshift(a);
    setTimeout(() => go('aju', { id: r.no }), 0);
    if (me.role === 'teknisi') return [{ toRole: 'manager', title: 'Pengajuan gaji perlu diperiksa', body: `${me.name} · ${a.keperluan} · ${fmt(total)}`, link: 'aju/' + r.no }];
    return [{ toRole: 'direktur', title: 'Pengajuan pembayaran baru', body: `${a.keperluan} · ${fmt(total)}`, link: 'aju/' + r.no }];
  }, 'Pengajuan terkirim');
  const teruskan = (id, note) => ubah(d => { const a = d.aju.find(x => x.id === id); a.status = 'menunggu_direktur'; log(a, 'Diperiksa Manager, diteruskan ke Direktur', note);
    return [{ toRole: 'direktur', title: 'Pengajuan gaji menunggu pembayaran', body: `${userById(a.pemohonId).name} · ${a.keperluan} · ${fmt(a.total)}`, link: 'aju/' + id }, { toRole: 'teknisi', toUser: a.pemohonId, title: 'Gaji diteruskan ke Direktur', body: a.keperluan, link: 'aju/' + id }]; }, 'Diteruskan ke Direktur');
  const kembalikan = (id, note) => ubah(d => { const a = d.aju.find(x => x.id === id); a.status = 'dikembalikan'; log(a, `Dikembalikan ${ROLES[me.role]}`, note);
    return [{ toRole: userById(a.pemohonId).role, toUser: a.pemohonId, title: 'Pengajuan dikembalikan', body: `${a.id}: ${note}`, link: 'aju/' + id }]; }, 'Dikembalikan ke pemohon');
  const tolak = (id, note) => ubah(d => { const a = d.aju.find(x => x.id === id); a.status = 'ditolak'; log(a, 'Ditolak Direktur', note);
    const n = [{ toRole: userById(a.pemohonId).role, toUser: a.pemohonId, title: 'Pengajuan ditolak', body: `${a.id}: ${note}`, link: 'aju/' + id }];
    if (userById(a.pemohonId).role !== 'manager') n.push({ toRole: 'manager', title: 'Pengajuan ditolak Direktur', body: `${a.id}: ${note}`, link: 'aju/' + id });
    return n; }, 'Pengajuan ditolak');
  const bayar = (id, b) => ubah(d => {
    const a = d.aju.find(x => x.id === id);
    d.seq.KK = (d.seq.KK || 0) + 1;
    const kk = { id: `KK-${String(d.seq.KK).padStart(4, '0')}`, tgl: b.tgl, deskripsi: `${a.keperluan} — ${a.jenis === 'gaji' ? userById(a.pemohonId).name : a.atasNama}`, kategori: a.kategori, jenisBiaya: a.jenisBiaya, nominal: a.total, ref: b.ref, pengajuanId: a.id, sinkron: false };
    d.kasKeluar.unshift(kk);
    a.status = 'dibayar'; a.bayar = b; a.kasKeluarId = kk.id; log(a, 'Dibayar Direktur', `${b.metode}${b.ref ? ' · ref ' + b.ref : ''}`);
    const n = [{ toRole: userById(a.pemohonId).role, toUser: a.pemohonId, title: 'Pembayaran sudah dilakukan', body: `${a.keperluan} · ${fmt(a.total)}`, link: 'aju/' + id }];
    if (userById(a.pemohonId).role !== 'manager') n.push({ toRole: 'manager', title: 'Pengajuan dibayar', body: `${a.id} · ${fmt(a.total)}`, link: 'aju/' + id });
    return n;
  }, 'Dibayar — tercatat di Kas Keluar');
  const ingatkanDirektur = () => {
    const tunggu = st.aju.filter(a => a.status === 'menunggu_direktur');
    if (!tunggu.length) { setToast('Tidak ada pengajuan yang menunggu Direktur.'); return; }
    ubah(() => [{ toRole: 'direktur', title: `Pengingat: ${tunggu.length} pengajuan menunggu pembayaran`, body: `Total ${fmt(sum(tunggu, a => a.total))} — mohon segera ditindaklanjuti (dari ${me.name})`, link: 'aju/' + tunggu[0].id }], 'Pengingat dikirim ke HP Direktur');
  };

  if (!me) return <PilihPengguna onPick={(id) => setSt(s => ({ ...s, settings: { ...s.settings, userId: id } }))} />;
  if (laporan) return <Laporan doc={laporan} st={st} onTutup={() => setLaporan(null)} />;

  const notifSaya = (st.notifs || []).filter(n => n.toRole === me.role && (!n.toUser || n.toUser === me.id));
  const belumDibaca = notifSaya.filter(n => !n.read).length;
  const pasang = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} setInstallEvt(null); };
  const mintaIzin = async () => {
    if (typeof Notification === 'undefined') { setToast('Browser ini belum mendukung notifikasi.'); return; }
    const p = await Notification.requestPermission(); setPerm(p);
    if (p === 'granted') systemNotify('Notifikasi aktif', 'Perangkat ini akan menerima pemberitahuan NVP Operasional.', '');
  };
  const ctx = { st, me, go, setLaporan, setToast, simpanPekerjaan, simpanTugas, terimaTugas, simpanUnit, selesaiTugas, simpanAju, teruskan, kembalikan, tolak, bayar, ingatkanDirektur, perm, mintaIzin, installEvt, pasang };

  let body;
  const v = view.name;
  if (v === 'tugas' && view.id) body = <DetailTugas ctx={ctx} id={view.id} />;
  else if (v === 'tugas') body = <DaftarTugas ctx={ctx} />;
  else if (v === 'buatTugas') body = <FormTugas ctx={ctx} dari={view.dari} />;
  else if (v === 'pekerjaan' && view.id) body = <DetailPekerjaan ctx={ctx} id={view.id} />;
  else if (v === 'pekerjaan') body = <DaftarPekerjaan ctx={ctx} />;
  else if (v === 'uploadPekerjaan') body = <FormPekerjaan ctx={ctx} />;
  else if (v === 'aju' && view.id) body = <DetailAju ctx={ctx} id={view.id} />;
  else if (v === 'aju') body = <DaftarAju ctx={ctx} />;
  else if (v === 'formAju') body = <FormAju ctx={ctx} jenis={view.jenis} editId={view.editId} />;
  else if (v === 'kas') body = <KasKeluar ctx={ctx} />;
  else if (v === 'arsip') body = <Arsip ctx={ctx} />;
  else if (v === 'notif') body = <Notifikasi list={notifSaya} buka={(n) => { setSt(s => ({ ...s, notifs: s.notifs.map(x => x.id === n.id ? { ...x, read: true } : x) })); const m = /^(tugas|aju|pekerjaan)\/(.+)$/.exec(n.link || ''); if (m) go(m[1], { id: m[2] }); }}
    bacaSemua={() => setSt(s => ({ ...s, notifs: s.notifs.map(x => (x.toRole === me.role && (!x.toUser || x.toUser === me.id)) ? { ...x, read: true } : x) }))} />;
  else if (v === 'profil') body = <Profil ctx={ctx} ganti={(id) => { setSt(s => ({ ...s, settings: { ...s.settings, userId: id } })); go('home'); }}
    setNotifRoles={(r) => setSt(s => ({ ...s, settings: { ...s.settings, notifRoles: r } }))}
    tesNotif={async () => { const ok = await systemNotify('Contoh notifikasi', 'Pengajuan gaji Budi Santoso menunggu pembayaran · Rp4.690.000', ''); setToast(ok ? 'Notifikasi dikirim ke perangkat ini' : 'Izinkan notifikasi dulu'); }}
    reset={() => { const s = seedState(); s.settings = { ...st.settings }; setSt(s); go('home'); setToast('Data contoh dikembalikan'); }} />;
  else body = me.role === 'teknisi' ? <BerandaTeknisi ctx={ctx} /> : me.role === 'manager' ? <BerandaManager ctx={ctx} /> : <BerandaDirektur ctx={ctx} />;

  const NAV = {
    teknisi: [['home', 'Beranda', I.home], ['tugas', 'Tugas', I.clip], ['uploadPekerjaan', 'Upload', I.plus, true], ['aju', 'Gaji', I.wallet], ['profil', 'Akun', I.user]],
    manager: [['home', 'Beranda', I.home], ['tugas', 'Pemeriksaan', I.clip], ['buatTugas', 'Buat tugas', I.plus, true], ['aju', 'Pengajuan', I.wallet], ['profil', 'Akun', I.user]],
    direktur: [['home', 'Beranda', I.home], ['tugas', 'Pemeriksaan', I.clip], ['aju', 'Pembayaran', I.wallet], ['kas', 'Kas keluar', I.cash], ['profil', 'Akun', I.user]],
  }[me.role];
  const tunggu = me.role === 'direktur' ? st.aju.filter(a => a.status === 'menunggu_direktur').length : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-30 bg-ink text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <button onClick={() => go('home')} className="flex items-center gap-2.5 text-left">
            <img src="icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
            <div className="leading-tight"><div className="text-sm font-black tracking-wide">NVP Operasional</div><div className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Contoh · {ROLES[me.role]}</div></div>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => go('notif')} aria-label="Notifikasi" className="relative p-2 rounded-full hover:bg-white/10"><Ico d={I.bell} size={22} />{belumDibaca > 0 && <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center font-bold">{belumDibaca}</span>}</button>
            <button onClick={() => go('profil')} className="w-8 h-8 rounded-full bg-red-600 font-black text-sm">{me.name[0]}</button>
          </div>
        </div>
        <div className="hazard h-1"></div>
      </header>
      <main className="max-w-lg mx-auto px-4 pt-4 pb-28">{body}</main>
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {NAV.map(([k, l, ic, fab]) => {
            const aktif = v === k || (k === 'tugas' && v === 'tugas') || (k === 'aju' && (v === 'aju' || v === 'formAju'));
            if (fab) return (
              <button key={k} aria-label={l} onClick={() => go(k)} className="flex flex-col items-center justify-center -mt-5">
                <span className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 border-4 border-white"><Ico d={ic} size={26} /></span>
                <span className="text-[10px] font-bold text-slate-600 mt-0.5">{l}</span>
              </button>
            );
            return (
              <button key={k} onClick={() => go(k)} className={`relative flex flex-col items-center justify-center py-2.5 text-[10px] font-bold ${aktif ? 'text-red-600' : 'text-slate-500'}`}>
                <Ico d={ic} size={22} /><span className="mt-0.5">{l}</span>
                {k === 'aju' && tunggu > 0 && <span className="absolute top-1.5 right-[20%] min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center">{tunggu}</span>}
              </button>
            );
          })}
        </div>
      </nav>
      {toast && <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl max-w-[90vw] text-center">{toast}</div>}
    </div>
  );
}

// ================================================================== pilih akun (demo)
function PilihPengguna({ onPick }) {
  return (
    <div className="min-h-screen bg-ink text-white flex flex-col">
      <div className="hazard h-1.5"></div>
      <div className="flex-1 max-w-lg w-full mx-auto px-5 py-10">
        <img src="icons/icon-192.png" alt="" className="w-16 h-16 rounded-2xl" />
        <h1 className="text-3xl font-black mt-5 leading-tight">NVP Operasional</h1>
        <p className="text-slate-300 mt-2 text-sm leading-relaxed">Contoh aplikasi operasional & alur kas PT Nuri Vira Pratama: pekerjaan refilling/pengadaan, tugas pemeriksaan APAR, pengajuan gaji & pembayaran. Data hanya contoh dan tersimpan di perangkat ini.</p>
        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-red-300">Masuk sebagai</p>
        <div className="mt-3 space-y-2.5">
          {USERS.map(u => (
            <button key={u.id} onClick={() => onPick(u.id)} className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3.5 text-left">
              <span className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-black">{u.name[0]}</span>
              <span className="flex-1"><span className="block font-bold">{u.name}</span><span className="block text-xs text-slate-400">{ROLES[u.role]}</span></span>
              <Ico d={I.back} className="rotate-180 text-slate-500" />
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">Di versi asli, akun dibuat oleh admin di portal viopran.com (menu Pengguna) dengan peran Teknisi, Manager Operasional, atau Direktur.</p>
      </div>
    </div>
  );
}

// ================================================================== beranda per peran
const Kartu = ({ judul, nilai, sub, onClick, tone }) => (
  <button onClick={onClick} className="text-left bg-white rounded-2xl border border-slate-200 p-4 active:bg-slate-50">
    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{judul}</div>
    <div className={`text-xl font-black mt-1.5 tabular-nums ${tone || ''}`}>{nilai}</div>
    {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
  </button>
);
function AjakNotif({ ctx }) {
  if (!(ctx.perm === 'default' || ctx.installEvt)) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3 items-start">
      <span className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><Ico d={I.bell} /></span>
      <div className="flex-1 text-sm"><b>Aktifkan pemberitahuan</b><p className="text-slate-500 text-xs mt-0.5">Agar HP berbunyi saat ada tugas, pengajuan, atau pembayaran baru.</p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {ctx.perm === 'default' && <button onClick={ctx.mintaIzin} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">Izinkan notifikasi</button>}
          {ctx.installEvt && <button onClick={ctx.pasang} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold">Pasang aplikasi</button>}
        </div>
      </div>
    </div>
  );
}
const Salam = ({ me }) => <div><h2 className="text-xl font-black">Halo, {me.name.split(' ')[0]}</h2><p className="text-sm text-slate-500">{ROLES[me.role]}</p></div>;

function BerandaTeknisi({ ctx }) {
  const { st, me, go } = ctx;
  const mine = st.tugas.filter(t => t.teknisiIds.includes(me.id));
  const baru = mine.filter(t => t.status === 'baru'), jalan = mine.filter(t => t.status === 'dikerjakan');
  const ajuSaya = st.aju.filter(a => a.pemohonId === me.id);
  const pkj = st.pekerjaan.filter(p => p.teknisiId === me.id);
  return (
    <div className="space-y-5">
      <Salam me={me} />
      <AjakNotif ctx={ctx} />
      <div className="grid grid-cols-2 gap-3">
        <Kartu judul="Tugas masuk" nilai={baru.length} sub="belum diterima" onClick={() => go('tugas')} tone={baru.length ? 'text-amber-600' : ''} />
        <Kartu judul="Sedang dikerjakan" nilai={jalan.length} sub="pemeriksaan" onClick={() => go('tugas')} />
      </div>
      <section>
        <h3 className="font-black mb-2">Tugas pemeriksaan saya</h3>
        {[...baru, ...jalan].length === 0 ? <Kosong teks="Belum ada tugas." /> : <div className="space-y-2.5">{[...baru, ...jalan].map(t => <KartuTugas key={t.id} t={t} onClick={() => go('tugas', { id: t.id })} />)}</div>}
      </section>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => go('uploadPekerjaan')} className="bg-red-600 text-white rounded-2xl p-4 text-left"><Ico d={I.wrench} /><b className="block mt-2 text-sm">Upload pekerjaan</b><span className="text-[11px] text-red-100">Refilling / pengadaan</span></button>
        <button onClick={() => go('formAju', { jenis: 'gaji' })} className="bg-slate-900 text-white rounded-2xl p-4 text-left"><Ico d={I.wallet} /><b className="block mt-2 text-sm">Ajukan gaji</b><span className="text-[11px] text-slate-400">Diperiksa Manager</span></button>
      </div>
      <section>
        <div className="flex items-center justify-between mb-2"><h3 className="font-black">Pekerjaan terakhir</h3><button onClick={() => go('pekerjaan')} className="text-xs font-bold text-red-600">Semua</button></div>
        {pkj.length === 0 ? <Kosong teks="Belum ada pekerjaan diunggah." /> : <div className="space-y-2.5">{pkj.slice(0, 2).map(p => <KartuPekerjaan key={p.id} p={p} onClick={() => go('pekerjaan', { id: p.id })} />)}</div>}
      </section>
      {ajuSaya.length > 0 && <section><h3 className="font-black mb-2">Pengajuan gaji saya</h3><div className="space-y-2.5">{ajuSaya.slice(0, 2).map(a => <KartuAju key={a.id} a={a} onClick={() => go('aju', { id: a.id })} />)}</div></section>}
    </div>
  );
}

function BerandaManager({ ctx }) {
  const { st, me, go } = ctx;
  const aktif = st.tugas.filter(t => t.status !== 'selesai');
  const belumJadwal = st.pekerjaan.filter(p => !p.taskId);
  const cek = st.aju.filter(a => a.status === 'cek_manager');
  const tunggu = st.aju.filter(a => a.status === 'menunggu_direktur');
  return (
    <div className="space-y-5">
      <Salam me={me} />
      <AjakNotif ctx={ctx} />
      <div className="grid grid-cols-2 gap-3">
        <Kartu judul="Gaji perlu diperiksa" nilai={cek.length} sub={fmt(sum(cek, a => a.total))} onClick={() => go('aju')} tone={cek.length ? 'text-amber-600' : ''} />
        <Kartu judul="Menunggu Direktur" nilai={tunggu.length} sub={fmt(sum(tunggu, a => a.total))} onClick={() => go('aju')} />
        <Kartu judul="Pemeriksaan aktif" nilai={aktif.length} sub={`${sum(aktif, t => progres(t).d)}/${sum(aktif, t => t.units.length)} APAR diperiksa`} onClick={() => go('tugas')} />
        <Kartu judul="Belum dijadwalkan" nilai={belumJadwal.length} sub="dari pekerjaan teknisi" onClick={() => go('pekerjaan')} tone={belumJadwal.length ? 'text-red-600' : ''} />
      </div>
      {tunggu.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4">
          <b className="text-sm">{tunggu.length} pengajuan menunggu pembayaran Direktur</b>
          <p className="text-xs text-slate-400 mt-0.5">Total {fmt(sum(tunggu, a => a.total))}. Kirim pengingat ke HP Direktur agar segera ditindaklanjuti.</p>
          <button onClick={ctx.ingatkanDirektur} className="mt-3 w-full py-2.5 rounded-xl bg-red-600 font-black text-sm flex items-center justify-center gap-2"><Ico d={I.send} size={18} /> Ingatkan Direktur</button>
        </div>
      )}
      {belumJadwal.length > 0 && (
        <section>
          <h3 className="font-black mb-2">Jadwalkan pemeriksaan</h3>
          <div className="space-y-2.5">{belumJadwal.map(p => <KartuPekerjaan key={p.id} p={p} onClick={() => go('pekerjaan', { id: p.id })} />)}</div>
        </section>
      )}
      <section>
        <h3 className="font-black mb-2">Progres pemeriksaan</h3>
        {aktif.length === 0 ? <Kosong teks="Tidak ada pemeriksaan aktif." /> : <div className="space-y-2.5">{aktif.map(t => <KartuTugas key={t.id} t={t} onClick={() => go('tugas', { id: t.id })} />)}</div>}
      </section>
      <button onClick={() => go('arsip')} className={btnGaris + ' flex items-center justify-center gap-2'}><Ico d={I.folder} size={18} /> Arsip PDF (Google Drive)</button>
    </div>
  );
}

function BerandaDirektur({ ctx }) {
  const { st, me, go } = ctx;
  const tunggu = st.aju.filter(a => a.status === 'menunggu_direktur');
  const bln = todayStr().slice(0, 7);
  const kasBulan = st.kasKeluar.filter(k => k.tgl.startsWith(bln));
  const aktif = st.tugas.filter(t => t.status !== 'selesai');
  const selesai = st.tugas.filter(t => t.status === 'selesai');
  return (
    <div className="space-y-5">
      <Salam me={me} />
      <AjakNotif ctx={ctx} />
      <div className="grid grid-cols-2 gap-3">
        <Kartu judul="Perlu dibayar" nilai={tunggu.length} sub={fmt(sum(tunggu, a => a.total))} onClick={() => go('aju')} tone={tunggu.length ? 'text-red-600' : ''} />
        <Kartu judul="Kas keluar bulan ini" nilai={fmt(sum(kasBulan, k => k.nominal))} sub={`${kasBulan.length} transaksi`} onClick={() => go('kas')} />
      </div>
      <section>
        <h3 className="font-black mb-2">Menunggu pembayaran Anda</h3>
        {tunggu.length === 0 ? <Kosong teks="Semua pengajuan sudah ditindaklanjuti." /> : <div className="space-y-2.5">{tunggu.map(a => <KartuAju key={a.id} a={a} onClick={() => go('aju', { id: a.id })} />)}</div>}
      </section>
      <section>
        <h3 className="font-black mb-2">Progres pemeriksaan</h3>
        {aktif.length === 0 ? <Kosong teks="Tidak ada pemeriksaan aktif." /> : <div className="space-y-2.5">{aktif.map(t => <KartuTugas key={t.id} t={t} onClick={() => go('tugas', { id: t.id })} />)}</div>}
        <p className="text-xs text-slate-500 mt-2">{selesai.length} pemeriksaan selesai · laporan PDF di arsip.</p>
      </section>
      <button onClick={() => go('arsip')} className={btnGaris + ' flex items-center justify-center gap-2'}><Ico d={I.folder} size={18} /> Arsip PDF (Google Drive)</button>
    </div>
  );
}

// ================================================================== kartu
const KartuTugas = ({ t, onClick }) => {
  const p = progres(t);
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 active:bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{t.id}</div><div className="font-bold leading-snug truncate">{t.tempat}</div>
          <div className="text-[11px] text-slate-500">{fmtDate(t.tglMulai)} – {fmtDate(t.tglSelesai)} · {t.teknisiIds.map(i => userById(i).name.split(' ')[0]).join(', ')}</div></div>
        <Badge map={ST_TUGAS} status={t.status} />
      </div>
      <div className="mt-3 flex items-center gap-3"><div className="flex-1"><Bar pct={p.pct} /></div><span className="text-xs font-bold tabular-nums text-slate-600">{p.d}/{p.n} APAR</span></div>
    </button>
  );
};
const KartuPekerjaan = ({ p, onClick }) => (
  <button onClick={onClick} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 active:bg-slate-50">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{p.id} · {userById(p.teknisiId).name}</div><div className="font-bold truncate">{p.konsumen}</div>
        <div className="text-[11px] text-slate-500">{p.jenis} · {fmtDate(p.tanggal)} · {sum(p.rows, r => r.jumlah)} APAR</div></div>
      {p.taskId ? <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${TONE.green}`}>Dijadwalkan</span> : <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${TONE.rose}`}>Belum dijadwalkan</span>}
    </div>
  </button>
);
const KartuAju = ({ a, onClick }) => (
  <button onClick={onClick} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 active:bg-slate-50">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{a.id} · {a.jenis === 'gaji' ? 'Gaji' : 'Pembayaran'} · {userById(a.pemohonId).name}</div><div className="font-bold truncate">{a.keperluan}</div></div>
      <div className="font-black tabular-nums shrink-0">{fmt(a.total)}</div>
    </div>
    <div className="mt-2"><Badge map={ST_AJU} status={a.status} /></div>
  </button>
);

// ================================================================== tugas pemeriksaan
function DaftarTugas({ ctx }) {
  const { st, me, go } = ctx;
  const [tab, setTab] = useState('aktif');
  const semua = me.role === 'teknisi' ? st.tugas.filter(t => t.teknisiIds.includes(me.id)) : st.tugas;
  const list = semua.filter(t => tab === 'aktif' ? t.status !== 'selesai' : t.status === 'selesai');
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">{me.role === 'teknisi' ? 'Tugas saya' : 'Pemeriksaan'}</h2>{me.role === 'manager' && <button onClick={() => go('buatTugas')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">+ Buat tugas</button>}</div>
      <div className="grid grid-cols-2 bg-slate-200 rounded-xl p-1 text-sm font-bold">{[['aktif', 'Aktif'], ['selesai', 'Selesai']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`py-1.5 rounded-lg ${tab === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{l}</button>)}</div>
      {list.length === 0 ? <Kosong teks="Tidak ada tugas." /> : <div className="space-y-2.5">{list.map(t => <KartuTugas key={t.id} t={t} onClick={() => go('tugas', { id: t.id })} />)}</div>}
      {me.role === 'manager' && <button onClick={() => go('pekerjaan')} className={btnGaris}>Lihat pekerjaan refilling/pengadaan teknisi</button>}
    </div>
  );
}

function FormTugas({ ctx, dari }) {
  const { st, go } = ctx;
  const sumber = dari ? st.pekerjaan.find(p => p.id === dari) : null;
  const awalRows = sumber ? sumber.rows.map(r => ({ ...r })) : [{ type: '', berat: '', jumlah: '' }];
  const [f, setF] = useState({ tempat: sumber ? sumber.konsumen : '', alamat: sumber ? sumber.alamat || '' : '', tglMulai: addDays(todayStr(), 1), tglSelesai: addDays(todayStr(), 1), teknisiIds: sumber ? [sumber.teknisiId] : [], catatan: '' });
  const [rows, setRows] = useState(awalRows);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const teknisi = USERS.filter(u => u.role === 'teknisi');
  const jumlah = sum(rows, r => r.jumlah);
  const kirim = () => {
    const rr = rows.filter(r => r.type || r.berat || r.jumlah).map(r => ({ ...r, jumlah: Number(r.jumlah) || 0 }));
    if (!f.tempat.trim()) return setErr('Isi tempat pemeriksaan.');
    if (!f.tglMulai || !f.tglSelesai || f.tglSelesai < f.tglMulai) return setErr('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    if (!rr.length || rr.some(r => !r.type || !r.berat || r.jumlah < 1)) return setErr('Lengkapi type, berat, dan jumlah APAR.');
    if (jumlah > 300) return setErr('Maksimal 300 APAR per tugas — pecah menjadi beberapa tugas.');
    if (!f.teknisiIds.length) return setErr('Pilih minimal satu teknisi.');
    setErr('');
    ctx.simpanTugas({ ...f, tempat: f.tempat.trim(), jumlah, type: rr[0].type, berat: rr[0].berat, rows: rr, units: buatUnit(rr), sumber: sumber ? sumber.id : null });
  };
  return (
    <div className="space-y-4">
      <Kembali onClick={() => go(sumber ? 'pekerjaan' : 'tugas', sumber ? { id: sumber.id } : {})} teks="Batal" />
      <div><h2 className="text-xl font-black">Buat tugas pemeriksaan</h2>{sumber && <p className="text-xs text-slate-500">Diisi otomatis dari {sumber.jenis.toLowerCase()} {sumber.id}</p>}</div>
      <Seksi judul="Lokasi & jadwal">
        <div className="space-y-3">
          <Lab t="Tempat pemeriksaan"><input value={f.tempat} onChange={(e) => set('tempat', e.target.value)} placeholder="Nama perusahaan / instansi" className={inp} /></Lab>
          <Lab t="Alamat" hint="opsional"><input value={f.alamat} onChange={(e) => set('alamat', e.target.value)} className={inp} /></Lab>
          <div className="grid grid-cols-2 gap-2">
            <Lab t="Tanggal mulai"><input type="date" value={f.tglMulai} onChange={(e) => set('tglMulai', e.target.value)} className={inp} /></Lab>
            <Lab t="Tanggal selesai"><input type="date" value={f.tglSelesai} onChange={(e) => set('tglSelesai', e.target.value)} className={inp} /></Lab>
          </div>
        </div>
      </Seksi>
      <Seksi judul="APAR yang diperiksa">
        <BarisApar rows={rows} setRows={setRows} />
        <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100"><span className="font-bold">Jumlah APAR</span><span className="text-xl font-black tabular-nums">{jumlah}</span></div>
      </Seksi>
      <Seksi judul="Teknisi">
        <div className="space-y-2">{teknisi.map(u => (
          <label key={u.id} className="flex items-center gap-3 text-sm bg-slate-50 rounded-xl p-3"><input type="checkbox" className="w-5 h-5 accent-red-600" checked={f.teknisiIds.includes(u.id)} onChange={(e) => set('teknisiIds', e.target.checked ? [...f.teknisiIds, u.id] : f.teknisiIds.filter(x => x !== u.id))} />{u.name}</label>
        ))}</div>
        <div className="mt-3"><Lab t="Catatan untuk teknisi" hint="opsional"><textarea rows="2" value={f.catatan} onChange={(e) => set('catatan', e.target.value)} className={inp}></textarea></Lab></div>
      </Seksi>
      {err && <p className="text-sm text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</p>}
      <button onClick={kirim} className={btnUtama}><Ico d={I.send} /> Kirim tugas ke teknisi</button>
    </div>
  );
}

function DetailTugas({ ctx, id }) {
  const { st, me, go } = ctx;
  const t = st.tugas.find(x => x.id === id);
  const [edit, setEdit] = useState(null);
  if (!t) return <Kosong teks="Tugas tidak ditemukan." />;
  const p = progres(t);
  const lay = t.units.filter(unitLayak).length;
  const sayaTeknisi = me.role === 'teknisi' && t.teknisiIds.includes(me.id);
  const bisaIsi = sayaTeknisi && t.status === 'dikerjakan';
  if (edit !== null) return <FormUnit t={t} idx={edit} onBatal={() => setEdit(null)} onSimpan={(u, lanjut) => { ctx.simpanUnit(t.id, edit, u); const nx = lanjut ? t.units.findIndex((x, i) => i > edit && !unitTerisi(x)) : -1; setEdit(nx >= 0 ? nx : null); if (nx < 0) window.scrollTo(0, 0); }} />;
  return (
    <div className="space-y-4">
      <Kembali onClick={() => go('tugas')} />
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{t.id}</div><h2 className="text-lg font-black leading-snug">{t.tempat}</h2>{t.alamat && <div className="text-xs text-slate-500">{t.alamat}</div>}</div><Badge map={ST_TUGAS} status={t.status} /></div>
        <div className="mt-3"><Baris k="Jadwal" v={`${fmtDate(t.tglMulai)} – ${fmtDate(t.tglSelesai)}`} /><Baris k="Jumlah APAR" v={t.jumlah} /><Baris k="Type / berat" v={`${t.type} · ${t.berat}${(t.rows || []).length > 1 ? ' + lainnya' : ''}`} /><Baris k="Teknisi" v={t.teknisiIds.map(i => userById(i).name).join(', ')} />{t.catatan && <Baris k="Catatan" v={t.catatan} />}</div>
        <div className="mt-3 flex items-center gap-3"><div className="flex-1"><Bar pct={p.pct} /></div><span className="text-xs font-bold tabular-nums">{p.d}/{p.n} diperiksa</span></div>
        {p.d > 0 && <p className="text-xs text-slate-500 mt-1.5"><b className="text-emerald-700">{lay} layak</b> · <b className="text-rose-600">{p.d - lay} tidak layak</b></p>}
      </div>
      {sayaTeknisi && t.status === 'baru' && <button onClick={() => ctx.terimaTugas(t.id)} className={btnUtama}><Ico d={I.check} /> Terima tugas</button>}
      {bisaIsi && p.d < p.n && <button onClick={() => setEdit(t.units.findIndex(u => !unitTerisi(u)))} className={btnUtama}><Ico d={I.clip} /> Periksa APAR berikutnya (no. {t.units.find(u => !unitTerisi(u)).no})</button>}
      {bisaIsi && p.d === p.n && <button onClick={() => { if (confirm('Selesaikan pemeriksaan dan buat laporan PDF?')) ctx.selesaiTugas(t.id); }} className={btnUtama}><Ico d={I.file} /> Selesai & buat laporan PDF</button>}
      {t.status === 'selesai' && <button onClick={() => ctx.setLaporan({ jenis: 'pemeriksaan', id: t.id })} className={btnUtama}><Ico d={I.file} /> Lihat laporan PDF</button>}
      <Seksi judul="Tabel pemeriksaan" aksi={t.status !== 'baru' && <button onClick={() => ctx.setLaporan({ jenis: 'pemeriksaan', id: t.id })} className="text-xs font-bold text-red-600">Pratinjau PDF</button>}>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs min-w-[520px]">
            <thead><tr className="text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200"><th className="py-2 pr-2">No</th><th className="pr-2">Lokasi</th><th className="pr-2">Tekanan</th><th className="pr-2">Masa berlaku</th><th className="pr-2">Selang</th><th className="pr-2">Handle</th><th className="pr-2">Pin</th><th>Hasil</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {t.units.map((u, i) => {
                const ok = unitTerisi(u);
                return (
                  <tr key={i} onClick={() => bisaIsi && setEdit(i)} className={bisaIsi ? 'cursor-pointer active:bg-slate-50' : ''}>
                    <td className="py-2 pr-2 font-bold">{u.no}</td><td className="pr-2">{u.lokasi || <span className="text-slate-300">—</span>}<div className="text-[10px] text-slate-400">{u.type.split(' ')[0]} {u.berat}</div></td>
                    <td className="pr-2">{u.tekanan || '—'}</td><td className={`pr-2 ${u.kedaluwarsa && u.kedaluwarsa < todayStr() ? 'text-rose-600 font-bold' : ''}`}>{u.kedaluwarsa ? fmtDate(u.kedaluwarsa) : '—'}</td>
                    <td className="pr-2">{u.selang || '—'}</td><td className="pr-2">{u.handle || '—'}</td><td className="pr-2">{u.pin ? (u.pin === 'Ada & tersegel' ? 'Ada' : 'Hilang') : '—'}</td>
                    <td>{ok ? (unitLayak(u) ? <span className="font-bold text-emerald-700">Layak</span> : <span className="font-bold text-rose-600">Tidak layak</span>) : <span className="text-slate-400">Belum</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {bisaIsi && <p className="text-[11px] text-slate-500 mt-2">Ketuk baris untuk mengisi atau mengubah.</p>}
      </Seksi>
      <Seksi judul="Riwayat"><Riwayat list={t.history} /></Seksi>
    </div>
  );
}

function FormUnit({ t, idx, onBatal, onSimpan }) {
  const [u, setU] = useState(() => ({ ...t.units[idx], foto: t.units[idx].foto || [] }));
  const set = (k, v) => setU(p => ({ ...p, [k]: v }));
  const ok = unitTerisi(u);
  const sisa = t.units.filter((x, i) => i !== idx && !unitTerisi(x)).length;
  return (
    <div className="space-y-4">
      <Kembali onClick={onBatal} teks="Kembali ke tabel" />
      <div><div className="text-[11px] font-bold text-slate-400">{t.tempat}</div><h2 className="text-xl font-black">APAR no. {u.no} <span className="text-sm font-bold text-slate-400">dari {t.units.length}</span></h2></div>
      <Seksi judul="Identitas">
        <div className="space-y-3">
          <Lab t="Lokasi penempatan"><input value={u.lokasi} onChange={(e) => set('lokasi', e.target.value)} placeholder="mis. Lobi lantai 1" className={inp} /></Lab>
          <div className="grid grid-cols-2 gap-2">
            <Lab t="Type"><select value={u.type} onChange={(e) => set('type', e.target.value)} className={inp}>{TYPE_APAR.map(x => <option key={x}>{x}</option>)}</select></Lab>
            <Lab t="Berat"><select value={u.berat} onChange={(e) => set('berat', e.target.value)} className={inp}>{BERAT_APAR.map(x => <option key={x}>{x}</option>)}</select></Lab>
          </div>
        </div>
      </Seksi>
      <Seksi judul="Pemeriksaan">
        <div className="space-y-4">
          <div><div className="text-xs font-bold text-slate-600 mb-1.5">Tekanan tabung (manometer)</div><Segmen label="Tekanan" value={u.tekanan} options={OPSI.tekanan} onChange={(v) => set('tekanan', v)} /></div>
          <Lab t="Masa berlaku isi" hint="tanggal kedaluwarsa pada label"><input type="date" aria-label="Masa berlaku" value={u.kedaluwarsa} onChange={(e) => set('kedaluwarsa', e.target.value)} className={inp} /></Lab>
          {u.kedaluwarsa && u.kedaluwarsa < todayStr() && <p className="text-xs text-rose-600 font-bold -mt-2">Sudah kedaluwarsa — perlu isi ulang.</p>}
          <div><div className="text-xs font-bold text-slate-600 mb-1.5">Selang / horn</div><Segmen label="Selang" value={u.selang} options={OPSI.selang} onChange={(v) => set('selang', v)} /></div>
          <div><div className="text-xs font-bold text-slate-600 mb-1.5">Handle / tuas</div><Segmen label="Handle" value={u.handle} options={OPSI.handle} onChange={(v) => set('handle', v)} /></div>
          <div><div className="text-xs font-bold text-slate-600 mb-1.5">Pin pengaman & segel</div><Segmen label="Pin" value={u.pin} options={OPSI.pin} onChange={(v) => set('pin', v)} /></div>
          <Lab t="Keterangan" hint="opsional"><input value={u.ket} onChange={(e) => set('ket', e.target.value)} placeholder="mis. Perlu isi ulang, label pudar" className={inp} /></Lab>
          <FotoInput label="Foto APAR" list={u.foto} setList={(l) => set('foto', l)} max={2} />
        </div>
      </Seksi>
      {ok && <div className={`rounded-2xl p-3 text-sm font-bold text-center ${unitLayak(u) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>Hasil: {unitLayak(u) ? 'LAYAK' : 'TIDAK LAYAK'}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button disabled={!ok} onClick={() => onSimpan(u, false)} className="py-3 rounded-2xl border border-slate-300 font-bold text-sm disabled:opacity-40">Simpan</button>
        <button disabled={!ok} onClick={() => onSimpan(u, true)} className="py-3 rounded-2xl bg-red-600 text-white font-black text-sm disabled:opacity-40">{sisa ? 'Simpan & berikutnya' : 'Simpan'}</button>
      </div>
    </div>
  );
}

// ================================================================== pekerjaan refilling / pengadaan
function FormPekerjaan({ ctx }) {
  const { go } = ctx;
  const [f, setF] = useState({ tanggal: todayStr(), jenis: 'Refilling', konsumen: '', alamat: '' });
  const [rows, setRows] = useState([{ type: '', berat: '', jumlah: '' }]);
  const [foto, setFoto] = useState([]);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const kirim = () => {
    const rr = rows.filter(r => r.type || r.berat || r.jumlah).map(r => ({ ...r, jumlah: Number(r.jumlah) || 0 }));
    if (!f.tanggal) return setErr('Isi tanggal pengerjaan.');
    if (!f.konsumen.trim()) return setErr('Isi nama perusahaan / instansi / konsumen.');
    if (!rr.length || rr.some(r => !r.type || !r.berat || r.jumlah < 1)) return setErr('Lengkapi type, berat, dan jumlah APAR.');
    if (!foto.length) return setErr('Tambahkan minimal satu foto dokumentasi pengerjaan.');
    setErr('');
    ctx.simpanPekerjaan({ ...f, konsumen: f.konsumen.trim(), rows: rr, foto });
  };
  return (
    <div className="space-y-4">
      <Kembali onClick={() => go('home')} teks="Batal" />
      <div><h2 className="text-xl font-black">Upload pekerjaan</h2><p className="text-xs text-slate-500">Hasilnya otomatis masuk daftar yang akan dijadwalkan pemeriksaan oleh Manager Operasional.</p></div>
      <Seksi judul="Pekerjaan">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">{['Refilling', 'Pengadaan'].map(j => <button key={j} type="button" onClick={() => set('jenis', j)} className={`rounded-xl border-2 p-3 text-left ${f.jenis === j ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'}`}><b className="block text-sm">{j}</b><span className="text-[11px] text-slate-500">{j === 'Refilling' ? 'isi ulang APAR' : 'APAR baru'}</span></button>)}</div>
          <Lab t="Tanggal pengerjaan"><input type="date" value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} className={inp} /></Lab>
          <Lab t="Nama perusahaan / instansi / konsumen"><input value={f.konsumen} onChange={(e) => set('konsumen', e.target.value)} className={inp} /></Lab>
          <Lab t="Alamat" hint="opsional"><input value={f.alamat} onChange={(e) => set('alamat', e.target.value)} className={inp} /></Lab>
        </div>
      </Seksi>
      <Seksi judul="APAR"><BarisApar rows={rows} setRows={setRows} /></Seksi>
      <Seksi judul="Dokumentasi"><FotoInput label="Foto pengerjaan" list={foto} setList={setFoto} max={6} /></Seksi>
      {err && <p className="text-sm text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</p>}
      <button onClick={kirim} className={btnUtama}><Ico d={I.send} /> Simpan pekerjaan</button>
    </div>
  );
}

function DaftarPekerjaan({ ctx }) {
  const { st, me, go } = ctx;
  const list = me.role === 'teknisi' ? st.pekerjaan.filter(p => p.teknisiId === me.id) : st.pekerjaan;
  return (
    <div className="space-y-3">
      <Kembali onClick={() => go(me.role === 'teknisi' ? 'home' : 'tugas')} />
      <h2 className="text-xl font-black">Pekerjaan refilling & pengadaan</h2>
      {list.length === 0 ? <Kosong teks="Belum ada pekerjaan." /> : <div className="space-y-2.5">{list.map(p => <KartuPekerjaan key={p.id} p={p} onClick={() => go('pekerjaan', { id: p.id })} />)}</div>}
    </div>
  );
}

function DetailPekerjaan({ ctx, id }) {
  const { st, me, go } = ctx;
  const p = st.pekerjaan.find(x => x.id === id);
  if (!p) return <Kosong teks="Pekerjaan tidak ditemukan." />;
  return (
    <div className="space-y-4">
      <Kembali onClick={() => go('pekerjaan')} />
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="text-[11px] font-bold text-slate-400">{p.id}</div><h2 className="text-lg font-black">{p.konsumen}</h2>
        <div className="mt-2"><Baris k="Jenis" v={p.jenis} /><Baris k="Tanggal" v={fmtDate(p.tanggal)} /><Baris k="Teknisi" v={userById(p.teknisiId).name} />{p.alamat && <Baris k="Alamat" v={p.alamat} />}<Baris k="Pemeriksaan" v={p.taskId ? `Dijadwalkan · ${p.taskId}` : 'Belum dijadwalkan'} /></div>
      </div>
      {me.role === 'manager' && !p.taskId && <button onClick={() => go('buatTugas', { dari: p.id })} className={btnUtama}><Ico d={I.clip} /> Jadwalkan tugas pemeriksaan</button>}
      {p.taskId && <button onClick={() => go('tugas', { id: p.taskId })} className={btnGaris}>Buka tugas {p.taskId}</button>}
      <Seksi judul="APAR"><table className="w-full text-sm"><tbody>{p.rows.map((r, i) => <tr key={i} className="border-b border-slate-100 last:border-0"><td className="py-2">{r.type}<div className="text-[11px] text-slate-400">{r.berat}</div></td><td className="py-2 text-right font-black">{r.jumlah} unit</td></tr>)}</tbody></table></Seksi>
      <Seksi judul="Dokumentasi" aksi={<button onClick={() => ctx.setLaporan({ jenis: 'pekerjaan', id: p.id })} className="text-xs font-bold text-red-600">Pratinjau PDF</button>}>
        {p.foto.length ? <div className="grid grid-cols-3 gap-2">{p.foto.map((a, i) => <img key={i} src={a.dataUrl} alt={a.name} className="aspect-square object-cover rounded-xl border border-slate-200" />)}</div> : <p className="text-sm text-slate-400">Tidak ada foto (data contoh).</p>}
      </Seksi>
    </div>
  );
}

// ================================================================== pengajuan gaji / pembayaran
function DaftarAju({ ctx }) {
  const { st, me, go } = ctx;
  const [tab, setTab] = useState('proses');
  const semua = me.role === 'teknisi' ? st.aju.filter(a => a.pemohonId === me.id) : st.aju;
  const list = semua.filter(a => tab === 'proses' ? !['dibayar', 'ditolak'].includes(a.status) : ['dibayar', 'ditolak'].includes(a.status));
  const judul = { teknisi: 'Pengajuan gaji saya', manager: 'Pengajuan', direktur: 'Pembayaran' }[me.role];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">{judul}</h2>
        {me.role === 'teknisi' && <button onClick={() => go('formAju', { jenis: 'gaji' })} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">+ Ajukan gaji</button>}
        {me.role === 'manager' && <button onClick={() => go('formAju', { jenis: 'pembayaran' })} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">+ Ajukan pembayaran</button>}
      </div>
      {me.role === 'manager' && st.aju.some(a => a.status === 'menunggu_direktur') && <button onClick={ctx.ingatkanDirektur} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2"><Ico d={I.send} size={16} /> Ingatkan Direktur ({st.aju.filter(a => a.status === 'menunggu_direktur').length} menunggu)</button>}
      <div className="grid grid-cols-2 bg-slate-200 rounded-xl p-1 text-sm font-bold">{[['proses', 'Dalam proses'], ['selesai', 'Selesai']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`py-1.5 rounded-lg ${tab === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{l}</button>)}</div>
      {list.length === 0 ? <Kosong teks="Tidak ada pengajuan." /> : <div className="space-y-2.5">{list.map(a => <KartuAju key={a.id} a={a} onClick={() => go('aju', { id: a.id })} />)}</div>}
    </div>
  );
}

function FormAju({ ctx, jenis, editId }) {
  const { st, me, go } = ctx;
  const awal = editId ? st.aju.find(a => a.id === editId) : null;
  const j = awal ? awal.jenis : jenis;
  const bln = addMonths(todayStr(), -1).slice(0, 7);
  const [f, setF] = useState(() => awal ? { ...awal, rincian: awal.rincian.map(r => ({ ...r })) } : j === 'gaji'
    ? { jenis: 'gaji', periode: bln, keperluan: '', kategori: 'Operasional', jenisBiaya: 'Gaji & upah karyawan', rincian: [{ desc: 'Gaji pokok', jumlah: '' }, { desc: 'Lembur', jumlah: '' }, { desc: 'Uang makan & transport', jumlah: '' }], bank: '', rekening: '', atasNama: me.name, lampiran: [], catatan: '' }
    : { jenis: 'pembayaran', keperluan: '', kategori: 'HPP', jenisBiaya: '', rincian: [{ desc: '', jumlah: '' }], bank: '', rekening: '', atasNama: '', lampiran: [], catatan: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setR = (i, k, v) => setF(p => ({ ...p, rincian: p.rincian.map((r, x) => x === i ? { ...r, [k]: v } : r) }));
  const total = sum(f.rincian, r => r.jumlah);
  const kirim = () => {
    const rin = f.rincian.filter(r => String(r.desc).trim() && Number(r.jumlah) > 0).map(r => ({ desc: String(r.desc).trim(), jumlah: Number(r.jumlah) }));
    if (j === 'gaji' && !f.periode) return setErr('Pilih periode gaji.');
    if (j !== 'gaji' && !f.keperluan.trim()) return setErr('Isi keperluan pembayaran.');
    if (j !== 'gaji' && !f.jenisBiaya) return setErr('Pilih jenis biaya.');
    if (!rin.length) return setErr('Isi minimal satu rincian dengan jumlah lebih dari 0.');
    if (!f.bank.trim() || !f.rekening.trim() || !f.atasNama.trim()) return setErr('Lengkapi bank, nomor rekening, dan atas nama.');
    setErr('');
    ctx.simpanAju({ ...f, keperluan: j === 'gaji' ? `Gaji ${fmtBulan(f.periode)}` : f.keperluan.trim(), rincian: rin, bank: f.bank.trim(), rekening: f.rekening.trim(), atasNama: f.atasNama.trim() }, editId);
  };
  return (
    <div className="space-y-4">
      <Kembali onClick={() => go('aju', editId ? { id: editId } : {})} teks="Batal" />
      <div><h2 className="text-xl font-black">{j === 'gaji' ? 'Pengajuan gaji' : 'Pengajuan pembayaran'}</h2><p className="text-xs text-slate-500">{j === 'gaji' ? 'Diperiksa Manager Operasional, lalu dibayar Direktur.' : 'Langsung ke Direktur untuk dibayar.'}</p></div>
      <Seksi judul={j === 'gaji' ? 'Periode' : 'Keperluan'}>
        {j === 'gaji' ? <Lab t="Bulan"><input type="month" value={f.periode} onChange={(e) => set('periode', e.target.value)} className={inp} /></Lab> : (
          <div className="space-y-3">
            <Lab t="Keperluan"><input value={f.keperluan} onChange={(e) => set('keperluan', e.target.value)} placeholder="mis. Pembelian 20 tabung APAR 6 kg" className={inp} /></Lab>
            <Lab t="Kategori"><select value={f.kategori} onChange={(e) => setF(p => ({ ...p, kategori: e.target.value, jenisBiaya: '' }))} className={inp}><option value="HPP">Pembelian barang (HPP)</option><option value="Operasional">Beban operasional</option></select></Lab>
            <Lab t="Jenis biaya"><select aria-label="Jenis biaya" value={f.jenisBiaya} onChange={(e) => set('jenisBiaya', e.target.value)} className={inp}><option value="">— Pilih —</option>{JENIS_BIAYA[f.kategori].map(x => <option key={x}>{x}</option>)}</select></Lab>
          </div>
        )}
      </Seksi>
      <Seksi judul="Rincian">
        <div className="space-y-2">
          {f.rincian.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_130px_auto] gap-2 items-center">
              <input aria-label={`Uraian ${i + 1}`} value={r.desc} onChange={(e) => setR(i, 'desc', e.target.value)} placeholder="Uraian" className={inp} />
              <input aria-label={`Jumlah rupiah ${i + 1}`} type="number" inputMode="numeric" min="0" value={r.jumlah} onChange={(e) => setR(i, 'jumlah', e.target.value)} placeholder="Rp" className={inp} />
              <button type="button" aria-label="Hapus baris" onClick={() => setF(p => ({ ...p, rincian: p.rincian.filter((_, x) => x !== i) }))} className="text-slate-400"><Ico d={I.trash} size={18} /></button>
            </div>
          ))}
          <button type="button" onClick={() => setF(p => ({ ...p, rincian: [...p.rincian, { desc: '', jumlah: '' }] }))} className="text-sm font-bold text-red-600">+ Tambah baris</button>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100"><span className="font-bold">Total</span><span className="text-xl font-black tabular-nums">{fmt(total)}</span></div>
        </div>
      </Seksi>
      <Seksi judul="Rekening tujuan">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2"><Lab t="Bank"><input value={f.bank} onChange={(e) => set('bank', e.target.value)} className={inp} /></Lab><Lab t="No. rekening"><input inputMode="numeric" value={f.rekening} onChange={(e) => set('rekening', e.target.value)} className={inp} /></Lab></div>
          <Lab t="Atas nama"><input value={f.atasNama} onChange={(e) => set('atasNama', e.target.value)} className={inp} /></Lab>
        </div>
      </Seksi>
      <Seksi judul="Lampiran"><FotoInput label={j === 'gaji' ? 'Foto absensi / slip lembur' : 'Foto penawaran / invoice'} list={f.lampiran || []} setList={(l) => set('lampiran', l)} max={4} /></Seksi>
      {err && <p className="text-sm text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</p>}
      <button onClick={kirim} className={btnUtama}><Ico d={I.send} /> {editId ? 'Ajukan ulang' : 'Kirim pengajuan'}</button>
    </div>
  );
}

function DetailAju({ ctx, id }) {
  const { st, me, go } = ctx;
  const a = st.aju.find(x => x.id === id);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [b, setB] = useState({ tgl: todayStr(), metode: 'Transfer bank', ref: '', bukti: [] });
  if (!a) return <Kosong teks="Pengajuan tidak ditemukan." />;
  const pem = userById(a.pemohonId);
  const tahap = a.jenis === 'gaji' ? ['Diajukan', 'Diperiksa Manager', 'Dibayar Direktur'] : ['Diajukan', 'Dibayar Direktur'];
  const posisi = { cek_manager: 1, menunggu_direktur: a.jenis === 'gaji' ? 2 : 1, dibayar: 99 }[a.status];
  const perlu = (fn) => { if (!note.trim()) { setErr('Tulis alasannya dulu.'); return; } setErr(''); fn(); };
  const kas = a.kasKeluarId ? st.kasKeluar.find(k => k.id === a.kasKeluarId) : null;
  return (
    <div className="space-y-4">
      <Kembali onClick={() => go('aju')} />
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{a.id} · {a.jenis === 'gaji' ? 'Gaji' : 'Pembayaran'}</div><h2 className="text-lg font-black leading-snug">{a.keperluan}</h2><div className="text-xs text-slate-500">{pem.name} · {ROLES[pem.role]}</div></div><Badge map={ST_AJU} status={a.status} /></div>
        <div className="text-3xl font-black mt-3 tabular-nums">{fmt(a.total)}</div>
        {posisi && <ol className={`grid gap-1.5 mt-4 ${tahap.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{tahap.map((l, i) => { const done = posisi > i, now = posisi === i; return <li key={l} className="text-center"><div className={`h-1.5 rounded-full ${done ? 'bg-emerald-500' : now ? 'bg-red-600' : 'bg-slate-200'}`}></div><div className={`text-[11px] font-bold mt-1.5 ${done ? 'text-emerald-700' : now ? 'text-red-700' : 'text-slate-400'}`}>{l}</div></li>; })}</ol>}
      </div>

      {me.role === 'manager' && a.status === 'cek_manager' && (
        <div className="bg-white rounded-2xl border-2 border-red-200 p-4 space-y-3">
          <div className="text-xs font-black uppercase tracking-widest text-red-600">Tindakan Anda</div>
          <p className="text-sm">Periksa rincian gaji dengan absensi dan lembur, lalu teruskan ke Direktur.</p>
          <textarea rows="2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (wajib jika dikembalikan)" className={inp}></textarea>
          {err && <p className="text-sm text-rose-600 font-semibold">{err}</p>}
          <div className="flex gap-2"><button onClick={() => perlu(() => ctx.kembalikan(a.id, note))} className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-sm">Kembalikan</button><button onClick={() => ctx.teruskan(a.id, note)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-sm">Teruskan ke Direktur</button></div>
        </div>
      )}
      {me.role === 'manager' && a.status === 'menunggu_direktur' && <button onClick={ctx.ingatkanDirektur} className={btnGaris + ' flex items-center justify-center gap-2'}><Ico d={I.send} size={16} /> Ingatkan Direktur</button>}
      {a.status === 'dikembalikan' && a.pemohonId === me.id && <button onClick={() => go('formAju', { editId: a.id })} className={btnUtama}>Perbaiki & ajukan ulang</button>}

      {me.role === 'direktur' && a.status === 'menunggu_direktur' && (
        <div className="bg-white rounded-2xl border-2 border-red-200 p-4 space-y-3">
          <div className="text-xs font-black uppercase tracking-widest text-red-600">Bayar pengajuan</div>
          <div className="bg-slate-50 rounded-xl p-3 text-sm"><Baris k="Ke" v={`${a.bank} ${a.rekening}`} /><Baris k="Atas nama" v={a.atasNama} /><Baris k="Nominal" v={fmt(a.total)} /></div>
          <div className="grid grid-cols-2 gap-2"><Lab t="Tanggal bayar"><input type="date" value={b.tgl} onChange={(e) => setB({ ...b, tgl: e.target.value })} className={inp} /></Lab><Lab t="Metode"><select value={b.metode} onChange={(e) => setB({ ...b, metode: e.target.value })} className={inp}><option>Transfer bank</option><option>Tunai</option></select></Lab></div>
          {b.metode === 'Transfer bank' && <Lab t="No. referensi transfer"><input value={b.ref} onChange={(e) => setB({ ...b, ref: e.target.value })} placeholder="mis. IB-123456" className={inp} /></Lab>}
          <FotoInput label="Bukti pembayaran" list={b.bukti} setList={(l) => setB({ ...b, bukti: l })} max={2} />
          <p className="text-[11px] text-slate-500">Setelah dibayar, transaksi otomatis tercatat di Kas Keluar portal viopran.com ({a.kategori} · {a.jenisBiaya}).</p>
          <textarea rows="2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan (wajib jika menolak)" className={inp}></textarea>
          {err && <p className="text-sm text-rose-600 font-semibold">{err}</p>}
          <div className="flex gap-2">
            <button onClick={() => perlu(() => ctx.tolak(a.id, note))} className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-sm">Tolak</button>
            <button disabled={!b.bukti.length || (b.metode === 'Transfer bank' && !b.ref.trim())} onClick={() => ctx.bayar(a.id, { ...b, ref: b.ref.trim() })} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-sm disabled:opacity-40">Tandai dibayar</button>
          </div>
        </div>
      )}

      <Seksi judul="Rincian"><table className="w-full text-sm"><tbody>{a.rincian.map((r, i) => <tr key={i} className="border-b border-slate-100 last:border-0"><td className="py-2">{r.desc}</td><td className="py-2 text-right font-bold tabular-nums">{fmt(r.jumlah)}</td></tr>)}<tr><td className="pt-2 font-black">Total</td><td className="pt-2 text-right font-black tabular-nums">{fmt(a.total)}</td></tr></tbody></table></Seksi>
      <Seksi judul="Rekening"><Baris k="Bank" v={a.bank} /><Baris k="No. rekening" v={a.rekening} /><Baris k="Atas nama" v={a.atasNama} /><Baris k="Kategori" v={`${a.kategori} · ${a.jenisBiaya}`} /></Seksi>
      {a.bayar && <Seksi judul="Pembayaran"><Baris k="Tanggal" v={fmtDate(a.bayar.tgl)} /><Baris k="Metode" v={a.bayar.metode} />{a.bayar.ref && <Baris k="Referensi" v={a.bayar.ref} />}{kas && <Baris k="Kas Keluar" v={`${kas.id} · ${kas.sinkron ? 'tersinkron ke portal' : 'menunggu sinkron'}`} />}
        {a.bayar.bukti && a.bayar.bukti.length > 0 && <div className="grid grid-cols-3 gap-2 mt-2">{a.bayar.bukti.map((x, i) => <img key={i} src={x.dataUrl} alt={x.name} className="aspect-square object-cover rounded-xl border" />)}</div>}</Seksi>}
      {a.lampiran && a.lampiran.length > 0 && <Seksi judul="Lampiran"><div className="grid grid-cols-3 gap-2">{a.lampiran.map((x, i) => <img key={i} src={x.dataUrl} alt={x.name} className="aspect-square object-cover rounded-xl border" />)}</div></Seksi>}
      <Seksi judul="Riwayat"><Riwayat list={a.history} /></Seksi>
    </div>
  );
}

const Riwayat = ({ list }) => (
  <ol className="relative border-l-2 border-slate-200 ml-1.5 space-y-3">
    {(list || []).map((h, i) => (
      <li key={i} className="pl-4 relative"><span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-white border-2 border-red-500"></span>
        <div className="text-sm font-bold">{h.action}</div><div className="text-[11px] text-slate-500">{userById(h.by).name} · {fmtTime(h.t)}</div>{h.note && <div className="text-xs text-slate-600 mt-0.5">“{h.note}”</div>}</li>
    ))}
  </ol>
);

// ================================================================== kas keluar (sinkron ke website)
function KasKeluar({ ctx }) {
  const { st } = ctx;
  const bln = todayStr().slice(0, 7);
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-black">Kas keluar</h2>
      <p className="text-xs text-slate-500">Setiap pembayaran yang ditandai Direktur otomatis dicatat di sini dan dikirim ke portal viopran.com → menu <b>Pengeluaran</b> (kategori & jenis biaya ikut terisi). Di contoh ini pengiriman ke portal masih simulasi.</p>
      <div className="grid grid-cols-2 gap-3"><Kartu judul="Bulan ini" nilai={fmt(sum(st.kasKeluar.filter(k => k.tgl.startsWith(bln)), k => k.nominal))} /><Kartu judul="Transaksi" nilai={st.kasKeluar.length} sub="semua" /></div>
      {st.kasKeluar.length === 0 ? <Kosong teks="Belum ada kas keluar." /> : st.kasKeluar.map(k => (
        <button key={k.id} onClick={() => ctx.go('aju', { id: k.pengajuanId })} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex justify-between gap-3"><div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{k.id} · {fmtDate(k.tgl)}</div><div className="font-bold text-sm">{k.deskripsi}</div><div className="text-[11px] text-slate-500">{k.kategori} · {k.jenisBiaya}</div></div><div className="font-black text-rose-600 tabular-nums shrink-0">−{fmt(k.nominal)}</div></div>
          <div className="mt-2 text-[11px] font-bold text-emerald-700">✓ {k.sinkron ? 'Tercatat di portal (Pengeluaran)' : 'Akan tercatat di portal saat terhubung'}</div>
        </button>
      ))}
    </div>
  );
}

// ================================================================== arsip PDF (Google Drive)
function Arsip({ ctx }) {
  const { st, go } = ctx;
  const klien = {};
  st.tugas.filter(t => t.status === 'selesai').forEach(t => { (klien[t.tempat] = klien[t.tempat] || []).push({ nama: `Laporan Pemeriksaan ${t.id.slice(0, 4)} - ${fmtDate(t.selesaiAt ? t.selesaiAt.slice(0, 10) : t.tglSelesai)}.pdf`, doc: { jenis: 'pemeriksaan', id: t.id } }); });
  st.pekerjaan.forEach(p => { (klien[p.konsumen] = klien[p.konsumen] || []).push({ nama: `Dokumentasi ${p.jenis} ${p.id.slice(0, 4)} - ${fmtDate(p.tanggal)}.pdf`, doc: { jenis: 'pekerjaan', id: p.id } }); });
  const nama = Object.keys(klien).sort();
  return (
    <div className="space-y-3">
      <Kembali onClick={() => go('home')} />
      <h2 className="text-xl font-black">Arsip PDF</h2>
      <p className="text-xs text-slate-500">Di versi asli, setiap laporan pemeriksaan dan dokumentasi pekerjaan otomatis disimpan sebagai PDF di Google Drive: <b>NVP Operasional / &lt;nama klien&gt; /</b>. Di contoh ini PDF dibuat di perangkat (ketuk file → Simpan PDF).</p>
      {nama.length === 0 ? <Kosong teks="Belum ada arsip." /> : nama.map(k => (
        <Seksi key={k} judul={k} aksi={<Ico d={I.folder} size={16} className="text-amber-500" />}>
          {klien[k].map((f, i) => <button key={i} onClick={() => ctx.setLaporan(f.doc)} className="w-full flex items-center gap-2.5 py-2 text-left text-sm border-b border-slate-100 last:border-0"><Ico d={I.file} size={18} className="text-red-600 shrink-0" /><span className="flex-1 min-w-0 truncate">{f.nama}</span></button>)}
        </Seksi>
      ))}
    </div>
  );
}

// ================================================================== laporan (tampilan cetak / PDF)
function Laporan({ doc, st, onTutup }) {
  const kop = (judul, nomor) => (
    <div className="flex justify-between items-end border-b-[3px] border-slate-900 pb-3 mb-4">
      <div className="flex items-center gap-3"><img src="icons/icon-192.png" alt="" className="w-12 h-12 rounded-lg" /><div><div className="font-black text-base leading-tight">{COMPANY.name}</div><div className="text-[10px] text-slate-600">{COMPANY.brand} · {COMPANY.address} · {COMPANY.phone}</div></div></div>
      <div className="text-right"><div className="font-black text-sm">{judul}</div><div className="text-[10px] text-slate-600">{nomor}</div></div>
    </div>
  );
  let isi = null, nama = '';
  if (doc.jenis === 'pemeriksaan') {
    const t = st.tugas.find(x => x.id === doc.id);
    const lay = t.units.filter(unitLayak).length, terisi = t.units.filter(unitTerisi).length;
    nama = `Laporan Pemeriksaan ${t.tempat}`;
    const foto = t.units.flatMap(u => (u.foto || []).map(f => ({ ...f, no: u.no })));
    isi = (
      <>
        {kop('LAPORAN PEMERIKSAAN APAR', t.id)}
        <table className="w-full text-[11px] mb-3"><tbody>
          <tr><td className="w-36 py-0.5 text-slate-600">Tempat pemeriksaan</td><td className="font-bold">{t.tempat}{t.alamat ? ` — ${t.alamat}` : ''}</td></tr>
          <tr><td className="py-0.5 text-slate-600">Tanggal</td><td className="font-bold">{fmtDate(t.tglMulai)} s.d. {fmtDate(t.tglSelesai)}</td></tr>
          <tr><td className="py-0.5 text-slate-600">Teknisi</td><td className="font-bold">{t.teknisiIds.map(i => userById(i).name).join(', ')}</td></tr>
          <tr><td className="py-0.5 text-slate-600">Hasil</td><td className="font-bold">{t.units.length} APAR · {lay} layak · {terisi - lay} tidak layak{terisi < t.units.length ? ` · ${t.units.length - terisi} belum diperiksa` : ''}</td></tr>
        </tbody></table>
        <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-[10px] border-collapse min-w-[640px] print:min-w-0">
          <thead><tr className="bg-slate-100">{['No', 'Lokasi', 'Type', 'Berat', 'Tekanan', 'Masa berlaku', 'Selang', 'Handle', 'Pin & segel', 'Hasil', 'Keterangan'].map(h => <th key={h} className="border border-slate-400 px-1 py-1 text-left">{h}</th>)}</tr></thead>
          <tbody>{t.units.map(u => (
            <tr key={u.no} className="avoid-break"><td className="border border-slate-300 px-1 py-0.5 text-center">{u.no}</td><td className="border border-slate-300 px-1">{u.lokasi}</td><td className="border border-slate-300 px-1">{u.type.split(' (')[0]}</td><td className="border border-slate-300 px-1 whitespace-nowrap">{u.berat}</td><td className="border border-slate-300 px-1">{u.tekanan}</td><td className="border border-slate-300 px-1 whitespace-nowrap">{u.kedaluwarsa ? fmtDate(u.kedaluwarsa) : ''}</td><td className="border border-slate-300 px-1">{u.selang}</td><td className="border border-slate-300 px-1">{u.handle}</td><td className="border border-slate-300 px-1">{u.pin}</td><td className={`border border-slate-300 px-1 font-bold ${unitTerisi(u) ? (unitLayak(u) ? 'text-emerald-700' : 'text-rose-700') : ''}`}>{unitTerisi(u) ? (unitLayak(u) ? 'Layak' : 'Tidak layak') : '-'}</td><td className="border border-slate-300 px-1">{u.ket}</td></tr>
          ))}</tbody>
        </table></div>
        <p className="text-[9px] text-slate-500 mt-1.5">Kriteria layak: tekanan normal, masa berlaku isi belum lewat, selang/horn tidak retak, handle baik, pin pengaman & segel ada.</p>
        {foto.length > 0 && <><div className="font-black text-[11px] mt-4 mb-2">Dokumentasi</div><div className="grid grid-cols-4 gap-2">{foto.map((f, i) => <figure key={i} className="avoid-break"><img src={f.dataUrl} alt="" className="w-full aspect-square object-cover border" /><figcaption className="text-[9px] text-center">APAR no. {f.no}</figcaption></figure>)}</div></>}
      </>
    );
  } else {
    const p = st.pekerjaan.find(x => x.id === doc.id);
    nama = `Dokumentasi ${p.jenis} ${p.konsumen}`;
    isi = (
      <>
        {kop(`DOKUMENTASI ${p.jenis.toUpperCase()} APAR`, p.id)}
        <table className="w-full text-[11px] mb-3"><tbody>
          <tr><td className="w-36 py-0.5 text-slate-600">Konsumen</td><td className="font-bold">{p.konsumen}{p.alamat ? ` — ${p.alamat}` : ''}</td></tr>
          <tr><td className="py-0.5 text-slate-600">Tanggal pengerjaan</td><td className="font-bold">{fmtDate(p.tanggal)}</td></tr>
          <tr><td className="py-0.5 text-slate-600">Teknisi</td><td className="font-bold">{userById(p.teknisiId).name}</td></tr>
        </tbody></table>
        <table className="w-full text-[11px] border-collapse"><thead><tr className="bg-slate-100">{['No', 'Type APAR', 'Berat', 'Jumlah'].map(h => <th key={h} className="border border-slate-400 px-2 py-1 text-left">{h}</th>)}</tr></thead>
          <tbody>{p.rows.map((r, i) => <tr key={i}><td className="border border-slate-300 px-2 py-1">{i + 1}</td><td className="border border-slate-300 px-2">{r.type}</td><td className="border border-slate-300 px-2">{r.berat}</td><td className="border border-slate-300 px-2">{r.jumlah} unit</td></tr>)}
            <tr className="font-bold"><td colSpan="3" className="border border-slate-300 px-2 py-1 text-right">Total</td><td className="border border-slate-300 px-2">{sum(p.rows, r => r.jumlah)} unit</td></tr></tbody></table>
        <div className="font-black text-[11px] mt-4 mb-2">Foto pengerjaan</div>
        {p.foto.length ? <div className="grid grid-cols-3 gap-2">{p.foto.map((f, i) => <img key={i} src={f.dataUrl} alt="" className="w-full aspect-square object-cover border avoid-break" />)}</div> : <p className="text-[11px] text-slate-500">Tidak ada foto (data contoh).</p>}
      </>
    );
  }
  useEffect(() => { const old = document.title; document.title = nama; return () => { document.title = old; }; }, [nama]);
  return (
    <div className="min-h-screen bg-slate-300 py-4 overflow-x-hidden">
      <div className="no-print max-w-[800px] mx-auto px-4 mb-3 flex gap-2">
        <button onClick={onTutup} className="px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm">Tutup</button>
        <button onClick={() => window.print()} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-black text-sm">Cetak / Simpan PDF</button>
      </div>
      <div className="print-page max-w-[800px] mx-auto bg-white p-6 text-slate-900 shadow-lg">
        {isi}
        <div className="mt-8 flex justify-end text-[11px] avoid-break"><div className="text-center w-48"><p className="mb-12 text-slate-600">Jakarta, {fmtDate(todayStr())}</p><p className="font-bold border-b border-slate-800 pb-0.5">&nbsp;</p><p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Manager Operasional</p></div></div>
      </div>
    </div>
  );
}

// ================================================================== notifikasi & akun
function Notifikasi({ list, buka, bacaSemua }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Notifikasi</h2>{list.some(n => !n.read) && <button onClick={bacaSemua} className="text-xs font-bold text-red-600">Tandai semua dibaca</button>}</div>
      {list.length === 0 ? <Kosong teks="Belum ada notifikasi untuk peran ini." /> : list.map(n => (
        <button key={n.id} onClick={() => buka(n)} className={`w-full text-left rounded-2xl border p-4 flex gap-3 ${n.read ? 'bg-white border-slate-200' : 'bg-red-50/60 border-red-200'}`}>
          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-slate-300' : 'bg-red-600'}`}></span>
          <span className="min-w-0"><span className="block font-bold text-sm">{n.title}</span><span className="block text-xs text-slate-600 mt-0.5 break-words">{n.body}</span><span className="block text-[11px] text-slate-400 mt-1">{fmtTime(n.t)}</span></span>
        </button>
      ))}
    </div>
  );
}

function Profil({ ctx, ganti, setNotifRoles, tesNotif, reset }) {
  const { st, me, perm } = ctx;
  const roles = st.settings.notifRoles;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">Akun & pengaturan</h2>
      <Seksi judul="Ganti akun (khusus contoh)">
        <div className="space-y-2">{USERS.map(u => (
          <button key={u.id} onClick={() => ganti(u.id)} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left ${u.id === me.id ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
            <span className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">{u.name[0]}</span>
            <span className="flex-1"><b className="block text-sm">{u.name}</b><span className="text-xs text-slate-500">{ROLES[u.role]}</span></span>
            {u.id === me.id && <Ico d={I.check} className="text-red-600" />}
          </button>
        ))}</div>
        <p className="text-[11px] text-slate-500 mt-2">Versi asli: akun dibuat admin di portal viopran.com, setiap orang masuk dengan username & password sendiri.</p>
      </Seksi>
      <Seksi judul="Notifikasi HP">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3"><span>Izin notifikasi: <b>{perm === 'granted' ? 'aktif' : perm === 'denied' ? 'diblokir' : perm === 'unsupported' ? 'tidak didukung' : 'belum diizinkan'}</b></span>{perm === 'default' && <button onClick={ctx.mintaIzin} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">Izinkan</button>}</div>
          {perm === 'denied' && <p className="text-xs text-rose-600">Notifikasi diblokir. Buka pengaturan browser/aplikasi untuk mengizinkannya lagi.</p>}
          <div>
            <div className="text-xs font-bold text-slate-600 mb-1.5">HP ini milik (menerima notifikasi untuk):</div>
            <div className="space-y-1.5">{Object.keys(ROLES).map(r => (
              <label key={r} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2"><input type="checkbox" className="w-4 h-4 accent-red-600" checked={roles.includes(r)} onChange={(e) => setNotifRoles(e.target.checked ? [...roles, r] : roles.filter(x => x !== r))} /><span className="text-xs font-semibold">{ROLES[r]}</span></label>
            ))}</div>
            <p className="text-[11px] text-slate-500 mt-1.5">Contoh: di HP pemilik centang Direktur saja. Saat Anda (sebagai Manager) menekan “Ingatkan Direktur”, HP ini berbunyi.</p>
          </div>
          <button onClick={tesNotif} className={btnGaris}>Kirim notifikasi uji</button>
        </div>
      </Seksi>
      <Seksi judul="Pasang di HP">
        {standalone ? <p className="text-sm text-emerald-700 font-semibold">Aplikasi sudah terpasang.</p> : ctx.installEvt ? <button onClick={ctx.pasang} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm">Pasang aplikasi</button> : (
          <p className="text-sm text-slate-600">{iOS ? <>iPhone: buka di <b>Safari</b> → <b>Bagikan</b> → <b>Tambah ke Layar Utama</b>. Notifikasi di iPhone hanya bekerja setelah dipasang (iOS 16.4+).</> : <>Android (Chrome): menu <b>⋮</b> → <b>Instal aplikasi</b> / <b>Tambahkan ke layar utama</b>.</>}</p>
        )}
      </Seksi>
      <Seksi judul="Data contoh">
        <p className="text-xs text-slate-500 mb-2">{st.tugas.length} tugas, {st.pekerjaan.length} pekerjaan, {st.aju.length} pengajuan tersimpan di perangkat ini. Belum terhubung ke portal viopran.com.</p>
        <button onClick={() => { if (confirm('Kembalikan data contoh awal? Data yang Anda buat akan hilang.')) reset(); }} className="w-full py-2.5 rounded-xl border border-rose-300 text-rose-700 font-bold text-sm">Kembalikan data contoh</button>
      </Seksi>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
