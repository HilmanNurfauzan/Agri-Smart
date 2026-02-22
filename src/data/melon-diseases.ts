/**
 * Knowledge Base: Sistem Pakar Diagnosis Penyakit Tanaman Melon
 * (Cucumis melo L.)
 *
 * Metode: Forward Chaining Expert System — Data Layer
 *
 * Sumber Referensi:
 * [1] Zitter, T.A., Hopkins, D.L., & Thomas, C.E. (1996).
 *     Compendium of Cucurbit Diseases. APS Press.
 * [2] Blancard, D., Lecoq, H., & Pitrat, M. (2006).
 *     A Colour Atlas of Cucurbit Diseases. Manson Publishing.
 * [3] Semangun, H. (2007). Penyakit-Penyakit Tanaman Hortikultura
 *     di Indonesia. Gadjah Mada University Press.
 * [4] Keinath, A.P. (2017). "Gummy Stem Blight of Cucurbits."
 *     Clemson University Extension Bulletin.
 * [5] CABI (2023). Crop Protection Compendium — Cucumis melo
 *     Pests & Diseases.
 * [6] Badan Litbang Pertanian RI (2020). Teknologi Pengendalian
 *     OPT Tanaman Melon. Puslitbanghorti.
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/** Kategori bagian tanaman untuk pemilihan awal (Step 1). */
export type PlantPart = "daun" | "batang" | "buah" | "akar" | "serangga";

/** Tingkat keparahan gejala atau penyakit. */
export type SeverityLevel = "low" | "medium" | "high";

/** Label tingkat kecocokan hasil diagnosis akhir. */
export type MatchLevel = "Sangat Tinggi" | "Tinggi" | "Sedang" | "Rendah";

/** Opsi bagian tanaman yang ditampilkan di Step 1. */
export interface PlantPartOption {
  id: PlantPart;
  label: string;
  description: string;
}

/** Gejala individual yang dapat diamati oleh pengguna. */
export interface Symptom {
  id: string;
  label: string;
  category: PlantPart;
  severity: SeverityLevel;
}

/** Data penyakit/hama beserta mapping gejala dan rekomendasi. */
export interface Disease {
  id: string;
  name: string;
  scientificName: string;
  symptoms: string[];
  description: string;
  recommendations: string[];
  severity: SeverityLevel;
}

/** Pertanyaan pembeda untuk menyempitkan kandidat penyakit (Step 3). */
export interface DifferentiatingQuestion {
  id: string;
  question: string;
  targetDiseases: string[];
  yesSupports: string[];
  noSupports: string[];
}

// ============================================================
// OPSI BAGIAN TANAMAN (Step 1)
// ============================================================

export const plantParts: PlantPartOption[] = [
  {
    id: "daun",
    label: "Daun",
    description: "Gejala pada permukaan, warna, atau bentuk daun",
  },
  {
    id: "batang",
    label: "Batang",
    description: "Gejala pada batang, cabang, atau pangkal tanaman",
  },
  {
    id: "buah",
    label: "Buah",
    description: "Gejala pada buah melon",
  },
  {
    id: "akar",
    label: "Akar",
    description: "Gejala pada sistem perakaran",
  },
  {
    id: "serangga",
    label: "Serangga / Hama",
    description: "Terdapat serangga, hama, atau tanda kehadirannya",
  },
];

// ============================================================
// DATA GEJALA — 39 Gejala, 5 Kategori
// ============================================================

export const symptomsData: Symptom[] = [
  // ──── DAUN (D01–D16) ────────────────────────────────────────
  {
    id: "D01",
    label: "Bercak kuning pada daun",
    category: "daun",
    severity: "medium",
  },
  {
    id: "D02",
    label: "Bercak coklat atau nekrotik pada daun",
    category: "daun",
    severity: "medium",
  },
  {
    id: "D03",
    label: "Tepung atau serbuk putih di permukaan daun",
    category: "daun",
    severity: "medium",
  },
  {
    id: "D04",
    label: "Daun layu meskipun tanah cukup lembap",
    category: "daun",
    severity: "high",
  },
  {
    id: "D05",
    label: "Daun menggulung atau keriting",
    category: "daun",
    severity: "medium",
  },
  {
    id: "D06",
    label: "Daun menguning menyeluruh (klorosis)",
    category: "daun",
    severity: "medium",
  },
  {
    id: "D07",
    label: "Pola mosaik (belang hijau tua dan hijau muda) pada daun",
    category: "daun",
    severity: "high",
  },
  {
    id: "D08",
    label: "Bercak basah (water-soaked) pada daun",
    category: "daun",
    severity: "high",
  },
  {
    id: "D09",
    label: "Daun mengering dari tepi",
    category: "daun",
    severity: "medium",
  },
  {
    id: "D10",
    label: "Bercak berbentuk sudut (angular) dibatasi tulang daun",
    category: "daun",
    severity: "medium",
  },
  {
    id: "D11",
    label: "Bercak coklat tua dengan lingkaran kuning (halo)",
    category: "daun",
    severity: "medium",
  },
  {
    id: "D12",
    label: "Lapisan spora keunguan atau abu-abu di bawah daun",
    category: "daun",
    severity: "high",
  },
  {
    id: "D13",
    label: "Daun menyempit dan memanjang seperti tali (shoestring)",
    category: "daun",
    severity: "high",
  },
  {
    id: "D14",
    label: "Layu terjadi pada satu sisi tanaman terlebih dahulu",
    category: "daun",
    severity: "high",
  },
  {
    id: "D15",
    label: "Nekrosis berbentuk huruf V dari tepi daun",
    category: "daun",
    severity: "high",
  },
  {
    id: "D16",
    label: "Bercak dengan pola cincin konsentris (target spot)",
    category: "daun",
    severity: "medium",
  },

  // ──── BATANG (B01–B07) ──────────────────────────────────────
  {
    id: "B01",
    label: "Lesi atau bercak coklat pada batang",
    category: "batang",
    severity: "medium",
  },
  {
    id: "B02",
    label: "Batang mengeluarkan getah/eksudat berwarna coklat kemerahan",
    category: "batang",
    severity: "high",
  },
  {
    id: "B03",
    label: "Busuk pada pangkal batang",
    category: "batang",
    severity: "high",
  },
  {
    id: "B04",
    label: "Perubahan warna coklat pada jaringan pembuluh batang",
    category: "batang",
    severity: "high",
  },
  {
    id: "B05",
    label: "Batang pecah atau retak memanjang",
    category: "batang",
    severity: "high",
  },
  {
    id: "B06",
    label: "Batang menjadi basah, lunak, dan membusuk",
    category: "batang",
    severity: "high",
  },
  {
    id: "B07",
    label: "Lesi cekung memanjang pada batang",
    category: "batang",
    severity: "medium",
  },

  // ──── BUAH (F01–F07) ────────────────────────────────────────
  {
    id: "F01",
    label: "Bercak cekung pada permukaan buah",
    category: "buah",
    severity: "medium",
  },
  {
    id: "F02",
    label: "Busuk buah basah (wet rot)",
    category: "buah",
    severity: "high",
  },
  {
    id: "F03",
    label: "Bercak berminyak (water-soaked) pada kulit buah",
    category: "buah",
    severity: "high",
  },
  {
    id: "F04",
    label: "Buah berubah bentuk atau cacat (deformasi)",
    category: "buah",
    severity: "medium",
  },
  {
    id: "F05",
    label: "Jaring kulit buah (netting) tidak rata atau abnormal",
    category: "buah",
    severity: "medium",
  },
  {
    id: "F06",
    label: "Bercak coklat atau nekrotik pada kulit buah",
    category: "buah",
    severity: "medium",
  },
  {
    id: "F07",
    label: "Buah membusuk sebelum mencapai kematangan",
    category: "buah",
    severity: "high",
  },

  // ──── AKAR (A01–A04) ────────────────────────────────────────
  {
    id: "A01",
    label: "Akar membusuk dan berwarna coklat atau hitam",
    category: "akar",
    severity: "high",
  },
  {
    id: "A02",
    label: "Bengkak atau bintil abnormal pada akar (puru/gall)",
    category: "akar",
    severity: "medium",
  },
  {
    id: "A03",
    label: "Tanaman mudah tercabut dari tanah",
    category: "akar",
    severity: "high",
  },
  {
    id: "A04",
    label: "Bibit/kecambah rebah dan mati (damping off)",
    category: "akar",
    severity: "high",
  },

  // ──── SERANGGA / HAMA (S01–S06) ────────────────────────────
  {
    id: "S01",
    label: "Koloni kutu kecil hijau/hitam di bawah daun (kutu daun)",
    category: "serangga",
    severity: "medium",
  },
  {
    id: "S02",
    label: "Serangga kecil putih berterbangan saat daun digoyang (kutu kebul)",
    category: "serangga",
    severity: "medium",
  },
  {
    id: "S03",
    label: "Bercak perak atau bekas tusukan halus pada daun",
    category: "serangga",
    severity: "low",
  },
  {
    id: "S04",
    label: "Lapisan lengket (embun madu) dan jelaga hitam pada daun",
    category: "serangga",
    severity: "medium",
  },
  {
    id: "S05",
    label: "Serangga kecil coklat/kuning pada bunga dan pucuk daun (thrips)",
    category: "serangga",
    severity: "medium",
  },
  {
    id: "S06",
    label: "Belatung atau larva di dalam buah (lalat buah)",
    category: "serangga",
    severity: "high",
  },
];

// ============================================================
// DATA PENYAKIT & HAMA — 19 Entri
// ============================================================

export const diseasesData: Disease[] = [
  // ──── PENYAKIT JAMUR (P01–P08) ──────────────────────────────
  {
    id: "P01",
    name: "Embun Bulu (Downy Mildew)",
    scientificName: "Pseudoperonospora cubensis",
    symptoms: ["D01", "D10", "D12", "D15", "D09"],
    description:
      "Penyakit jamur obligat yang utamanya menyerang daun melon dalam kondisi kelembaban tinggi (>85%) dan suhu 15–25°C. Spora (sporangia) menyebar melalui angin dan percikan air. Gejala awal berupa bercak kuning angular pada permukaan atas daun, diikuti munculnya lapisan spora berwarna keunguan atau abu-abu di permukaan bawah daun — terutama terlihat pada pagi hari saat udara masih lembap. Tanpa penanganan, bercak meluas membentuk nekrosis berbentuk huruf V dari tepi daun, dan akhirnya seluruh daun mengering.",
    recommendations: [
      "Aplikasikan fungisida berbahan aktif mankozeb atau klorotalonil secara preventif setiap 7–10 hari saat musim hujan.",
      "Gunakan fungisida sistemik (metalaksil atau dimetomorf) jika serangan sudah terjadi; rotasikan dengan fungisida kontak untuk mencegah resistensi.",
      "Tingkatkan sirkulasi udara dengan jarak tanam minimal 60 cm dan lakukan pemangkasan daun bawah yang rapat.",
      "Hindari penyiraman pada sore atau malam hari untuk mengurangi kelembaban kanopi daun.",
    ],
    severity: "high",
  },
  {
    id: "P02",
    name: "Embun Tepung (Powdery Mildew)",
    scientificName: "Podosphaera xanthii",
    symptoms: ["D03", "D06", "D09"],
    description:
      "Penyakit jamur yang ditandai munculnya lapisan tepung atau serbuk putih pada permukaan atas maupun bawah daun. Berbeda dengan embun bulu, embun tepung justru berkembang baik pada kondisi kering dengan suhu moderat (20–27°C) dan kelembaban udara tinggi tanpa hujan langsung. Spora menyebar melalui angin. Infeksi biasanya dimulai pada daun tua di bagian bawah tanaman, kemudian menjalar ke atas. Daun yang terinfeksi parah menguning dan mengering sehingga mengurangi fotosintesis, yang berdampak pada penurunan ukuran dan kualitas buah.",
    recommendations: [
      "Aplikasikan fungisida berbahan aktif sulfur (belerang) atau trifloksistrobin pada awal kemunculan gejala.",
      "Semprot larutan kalium bikarbonat (5 g/L air) sebagai alternatif organik yang cukup efektif.",
      "Gunakan varietas melon yang memiliki ketahanan terhadap powdery mildew jika tersedia.",
      "Buang dan musnahkan daun yang terinfeksi berat untuk mengurangi sumber inokulum di lahan.",
    ],
    severity: "medium",
  },
  {
    id: "P03",
    name: "Layu Fusarium (Fusarium Wilt)",
    scientificName: "Fusarium oxysporum f.sp. melonis",
    symptoms: ["D04", "D14", "D06", "B04", "B03"],
    description:
      "Penyakit layu yang disebabkan jamur tanah (soil-borne). Patogen masuk melalui akar dan mengkolonisasi jaringan pembuluh (xylem), menyumbat aliran air ke bagian atas tanaman. Gejala khas adalah layu yang dimulai dari satu sisi tanaman (unilateral wilt) — yaitu hanya satu cabang atau sisi yang layu sementara sisi lain masih segar. Ketika batang dipotong melintang, terlihat perubahan warna coklat pada jaringan pembuluh. Pangkal batang dapat membusuk. Jamur bertahan di tanah selama bertahun-tahun sebagai klamidospora, sehingga sulit dieradikasi.",
    recommendations: [
      "Gunakan varietas tahan atau rootstock (batang bawah) yang resisten terhadap Fusarium, seperti labu Cucurbita moschata.",
      "Lakukan rotasi tanaman dengan tanaman non-cucurbit selama minimal 3–4 tahun.",
      "Aplikasikan agen hayati Trichoderma harzianum ke media tanam sebelum penanaman dengan dosis 10–20 g per lubang tanam.",
      "Pastikan drainase lahan baik dan hindari penggenangan air yang meningkatkan risiko infeksi akar.",
    ],
    severity: "high",
  },
  {
    id: "P04",
    name: "Busuk Batang Gummy (Gummy Stem Blight)",
    scientificName: "Didymella bryoniae",
    symptoms: ["B01", "B02", "B05", "B07", "D02", "F06"],
    description:
      "Penyakit jamur yang dapat menyerang seluruh bagian tanaman melon — daun, batang, dan buah. Gejala paling khas terdapat pada batang berupa lesi coklat yang mengeluarkan eksudat (getah) berwarna coklat kemerahan (gummy exudate). Batang yang terinfeksi berat dapat pecah atau retak memanjang. Pada daun muncul bercak coklat nekrotik, sedangkan pada buah terdapat bercak coklat yang dapat menjadi pintu masuk busuk sekunder. Patogen terbawa benih dan bertahan pada sisa tanaman, menyebar pesat saat kelembaban tinggi.",
    recommendations: [
      "Gunakan benih bersertifikat yang bebas patogen atau perlakukan benih dengan fungisida tiram sebelum tanam.",
      "Aplikasikan fungisida klorotalonil atau boskamid secara preventif pada batang dan daun bagian bawah, terutama saat kelembaban tinggi.",
      "Bersihkan seluruh sisa tanaman di akhir musim tanam dan bakar untuk mencegah inokulum tersisa di lahan.",
      "Hindari pelukaan batang saat pemangkasan; gunakan alat steril dan jangan bekerja di lahan saat tanaman basah.",
    ],
    severity: "high",
  },
  {
    id: "P05",
    name: "Antraknosa (Anthracnose)",
    scientificName: "Colletotrichum orbiculare",
    symptoms: ["D02", "D16", "F01", "B07"],
    description:
      "Penyakit jamur yang menyebabkan bercak cekung (sunken lesion) pada buah serta lesi pada daun dan batang. Pada daun, muncul bercak coklat yang terkadang memiliki pola cincin konsentris. Pada buah, bercak cekung berwarna coklat tua sering kali menjadi pintu masuk busuk sekunder. Dalam kondisi lembap, pada permukaan bercak dapat terlihat massa spora berwarna merah muda-salmon (acervuli). Patogen menyebar melalui percikan air hujan dan berkembang optimal pada suhu 22–27°C dengan kelembaban tinggi.",
    recommendations: [
      "Aplikasikan fungisida berbahan aktif mankozeb atau azoksistrobin setiap 7–10 hari, terutama saat musim hujan.",
      "Gunakan mulsa plastik untuk mengurangi percikan tanah ke tanaman dan mencegah infeksi dari bawah.",
      "Panen buah tepat waktu dan hindari luka mekanis pada buah selama penanganan pascapanen.",
      "Lakukan rotasi tanaman minimal 2 tahun dengan tanaman non-cucurbit.",
    ],
    severity: "high",
  },
  {
    id: "P06",
    name: "Bercak Daun Cercospora (Cercospora Leaf Spot)",
    scientificName: "Cercospora citrullina",
    symptoms: ["D02", "D11", "D09"],
    description:
      "Penyakit jamur yang menyebabkan bercak kecil bulat (diameter 3–6 mm) berwarna coklat tua dengan lingkaran kuning (halo) di sekelilingnya pada permukaan daun. Bercak biasanya muncul tersebar di seluruh permukaan daun tanpa pola angular. Pada serangan berat, bercak-bercak dapat bergabung (koalesensi) menyebabkan daun mengering dari tepi. Penyakit ini umum di daerah tropis dengan kelembaban tinggi dan suhu hangat, serta bertahan pada sisa tanaman sebagai sumber inokulum.",
    recommendations: [
      "Buang daun-daun yang terinfeksi berat dan musnahkan untuk mengurangi sumber spora.",
      "Aplikasikan fungisida berbahan aktif mankozeb atau klorotalonil secara preventif setiap 10–14 hari.",
      "Jaga jarak tanam yang cukup untuk meningkatkan sirkulasi udara di antara tanaman.",
      "Hindari irigasi overhead (sprinkler) yang membuat daun basah dalam waktu lama; gunakan irigasi tetes.",
    ],
    severity: "medium",
  },
  {
    id: "P07",
    name: "Hawar Daun Alternaria (Alternaria Leaf Blight)",
    scientificName: "Alternaria cucumerina",
    symptoms: ["D02", "D16", "D09", "F06"],
    description:
      "Penyakit jamur yang menyebabkan bercak nekrotik dengan pola cincin konsentris khas (target spot / bull's-eye pattern) pada daun tua. Bercak dimulai kecil lalu meluas menjadi 1–2 cm. Pola cincin konsentris ini merupakan ciri pembeda utama Alternaria dibandingkan bercak jamur lainnya. Pada serangan berat, daun mengering dan rontok. Patogen juga dapat menginfeksi buah menyebabkan bercak coklat pada kulit. Jamur bertahan pada sisa tanaman dan menyebar melalui spora udara, berkembang optimal saat tanaman mengalami stres nutrisi.",
    recommendations: [
      "Aplikasikan fungisida berbahan aktif iprodion atau azoksistrobin saat gejala awal muncul.",
      "Pastikan pemupukan seimbang — terutama kalium — untuk memperkuat ketahanan alami tanaman.",
      "Bersihkan sisa tanaman dari musim sebelumnya karena jamur bertahan sebagai saprofit di sisa jaringan.",
      "Lakukan penyiraman di pagi hari agar daun cepat kering dan tidak kondusif untuk perkembangan spora.",
    ],
    severity: "medium",
  },
  {
    id: "P08",
    name: "Rebah Kecambah (Damping Off)",
    scientificName: "Pythium spp. dan Rhizoctonia solani",
    symptoms: ["A04", "B03", "B06", "A01", "A03"],
    description:
      "Penyakit kompleks yang menyerang bibit atau kecambah muda (umur kurang dari 2 minggu). Disebabkan oleh satu atau lebih patogen tanah — terutama Pythium dan Rhizoctonia. Patogen menyerang pangkal batang dan akar bibit, menyebabkan jaringan menjadi basah, lunak, dan mengerut. Bibit roboh (rebah) dan mati dalam waktu singkat. Tanaman yang sudah tercabut menunjukkan akar yang membusuk berwarna coklat/hitam. Penyakit berkembang cepat pada kondisi tanah terlalu lembap, suhu rendah, dan kepadatan bibit tinggi.",
    recommendations: [
      "Gunakan media semai steril atau perlakukan media tanam dengan fungisida metalaksil atau kaptam sebelum semai.",
      "Hindari penyiraman berlebihan pada fase kecambah; pastikan drainase media semai benar-benar baik.",
      "Berikan jarak semai yang cukup untuk mengurangi kelembaban antar bibit dan meningkatkan sirkulasi udara.",
      "Rendam benih dalam larutan fungisida metalaksil 25% WP (dosis 2 g/L air) selama 15 menit sebelum disemai.",
    ],
    severity: "high",
  },

  // ──── PENYAKIT BAKTERI (P09–P11) ────────────────────────────
  {
    id: "P09",
    name: "Busuk Buah Bakteri (Bacterial Fruit Blotch)",
    scientificName: "Acidovorax citrulli",
    symptoms: ["F03", "D08", "F02"],
    description:
      "Penyakit bakteri serius yang terbawa benih (seed-borne) dan berpotensi menghancurkan hasil panen secara total. Gejala awal pada bibit berupa bercak basah (water-soaked) pada kotiledon dan daun muda. Pada buah, muncul bercak berminyak gelap (water-soaked blotch) yang cepat meluas dan diikuti busuk basah (wet rot). Bakteri menyebar sangat cepat melalui percikan air hujan, irigasi overhead, alat pertanian, dan aktivitas pekerja di lahan. Penyakit ini sangat destruktif pada melon dan semangka.",
    recommendations: [
      "Gunakan benih bersertifikat bebas patogen; perlakukan benih dengan HCl 1% selama 15 menit atau panas kering (70°C, 72 jam) untuk mengurangi inokulum.",
      "Aplikasikan bakterisida berbahan aktif tembaga (copper hydroxide) secara preventif setiap 7 hari sejak fase bibit.",
      "Segera cabut dan musnahkan tanaman yang menunjukkan gejala untuk mencegah penyebaran ke tanaman sehat.",
      "Sterilkan semua alat pertanian dan hindari bekerja di lahan saat tanaman masih basah.",
    ],
    severity: "high",
  },
  {
    id: "P10",
    name: "Layu Bakteri (Bacterial Wilt)",
    scientificName: "Erwinia tracheiphila",
    symptoms: ["D04", "D06"],
    description:
      "Penyakit bakteri yang ditularkan oleh kumbang ketimun (cucumber beetle). Bakteri berkembang biak di dalam jaringan pembuluh (xylem) dan menghasilkan polisakarida kental yang menyumbat aliran air, menyebabkan layu mendadak dan permanen. Gejala layu biasanya terjadi sangat cepat (1–2 hari) dan tidak pulih meskipun disiram air. Uji diagnostik sederhana: potong batang yang layu, tempelkan kedua ujung potongan, lalu tarik perlahan — jika ada benang lendir putih susu yang ikut tertarik, ini merupakan indikasi kuat layu bakteri.",
    recommendations: [
      "Kendalikan populasi kumbang ketimun (cucumber beetle) sebagai vektor utama menggunakan insektisida karbaril atau imidakloprid.",
      "Gunakan perangkap kuning lengket (yellow sticky trap) di sekitar lahan untuk memantau dan mengurangi populasi vektor.",
      "Cabut dan musnahkan tanaman yang sudah layu total untuk mencegah bakteri menyebar ke tanaman sehat melalui vektor.",
      "Gunakan row cover (penutup barisan) pada awal pertumbuhan untuk melindungi tanaman muda dari serangan kumbang vektor.",
    ],
    severity: "high",
  },
  {
    id: "P11",
    name: "Bercak Daun Sudut (Angular Leaf Spot)",
    scientificName: "Pseudomonas syringae pv. lachrymans",
    symptoms: ["D10", "D08", "D09"],
    description:
      "Penyakit bakteri yang menyebabkan bercak kecil berbentuk sudut (angular) pada daun — bentuknya dibatasi oleh tulang daun sehingga tidak bulat melainkan bersudut. Bercak awalnya tampak basah atau berminyak (water-soaked), kemudian mengering menjadi berwarna coklat dan rapuh. Pada pagi hari yang lembap, sering terlihat tetesan eksudat bakteri berwarna putih susu di bawah bercak. Bakteri menyebar melalui percikan air hujan, irigasi, dan alat pertanian yang terkontaminasi.",
    recommendations: [
      "Aplikasikan bakterisida berbahan aktif tembaga (copper oxychloride) secara preventif setiap 7–10 hari.",
      "Hindari irigasi sprinkler; gunakan irigasi tetes untuk mengurangi percikan air yang menyebarkan bakteri.",
      "Lakukan rotasi tanaman dengan tanaman non-cucurbit selama minimal 2 tahun untuk memutus siklus bakteri.",
      "Gunakan benih yang sudah diperlakukan (seed treatment) dan varietas toleran jika tersedia.",
    ],
    severity: "medium",
  },

  // ──── PENYAKIT VIRUS (P12–P14) ──────────────────────────────
  {
    id: "P12",
    name: "Virus Mosaik Mentimun (CMV)",
    scientificName: "Cucumber Mosaic Virus",
    symptoms: ["D07", "D05", "D06", "D13", "F04"],
    description:
      "Virus yang ditularkan secara non-persisten oleh kutu daun (aphid), terutama Aphis gossypii. Virus ini memiliki kisaran inang yang sangat luas (lebih dari 1.000 spesies tanaman). Gejala khas meliputi pola mosaik (belang hijau tua dan hijau muda) pada daun, daun keriting atau menggulung, klorosis menyeluruh, dan pada infeksi berat daun menyempit memanjang menyerupai tali sepatu (shoestring leaf). Pertumbuhan tanaman terhambat secara signifikan dan buah yang terbentuk mengalami deformasi. Tanaman tidak dapat disembuhkan setelah terinfeksi.",
    recommendations: [
      "Cabut dan musnahkan (bakar) tanaman yang terinfeksi segera untuk mencegah penyebaran ke tanaman sehat.",
      "Kendalikan populasi kutu daun sebagai vektor menggunakan insektisida imidakloprid atau abamektin, atau semprot minyak neem secara rutin.",
      "Gunakan mulsa plastik perak/aluminium untuk mengusir aphid — refleksi cahaya mengganggu navigasi serangga vektor.",
      "Tanam tanaman penghalang (barrier crop) seperti jagung di sekeliling lahan melon untuk mengurangi migrasi vektor.",
    ],
    severity: "high",
  },
  {
    id: "P13",
    name: "Virus Mosaik Kuning Zucchini (ZYMV)",
    scientificName: "Zucchini Yellow Mosaic Virus",
    symptoms: ["D07", "D05", "D01", "F04", "F05"],
    description:
      "Virus dari keluarga Potyviridae yang ditularkan secara non-persisten oleh beberapa spesies kutu daun. Gejala utama berupa mosaik kuning mencolok pada daun, daun keriting dan berubah bentuk, serta deformasi buah yang parah. Berbeda dengan CMV, ZYMV cenderung menyebabkan kerusakan buah yang lebih berat — permukaan buah menjadi benjol-benjol (knobby) dan jaring kulit (netting) tidak rata. Virus menyebar cepat di lapangan dan dapat menurunkan hasil panen hingga 50–100% pada serangan berat.",
    recommendations: [
      "Cabut dan musnahkan tanaman bergejala sesegera mungkin untuk mengurangi sumber penularan.",
      "Kendalikan vektor kutu daun secara intensif sejak awal tanam menggunakan insektisida sistemik atau minyak mineral (petroleum spray oil) yang menghambat penularan virus.",
      "Gunakan varietas melon yang memiliki gen ketahanan terhadap ZYMV jika tersedia di pasaran.",
      "Terapkan sistem border crop atau tanaman perangkap di sekeliling lahan untuk mengurangi laju penyebaran vektor.",
    ],
    severity: "high",
  },
  {
    id: "P14",
    name: "Virus Mosaik Semangka (WMV)",
    scientificName: "Watermelon Mosaic Virus",
    symptoms: ["D07", "D05", "D06", "F04"],
    description:
      "Virus dari keluarga Potyviridae yang ditularkan oleh kutu daun secara non-persisten. Gejala pada melon berupa mosaik hijau pada daun, daun keriting, klorosis menyeluruh, dan deformasi buah. Gejala WMV umumnya lebih ringan dibandingkan ZYMV tetapi tetap menurunkan kualitas dan kuantitas produksi. Virus memiliki kisaran inang luas pada tanaman Cucurbitaceae dan Leguminosae, sehingga gulma dan tanaman liar di sekitar lahan sering menjadi sumber inokulum (reservoir).",
    recommendations: [
      "Kendalikan gulma di sekitar lahan, terutama dari famili labu-labuan dan kacang-kacangan yang dapat menjadi reservoir virus.",
      "Aplikasikan insektisida atau minyak mineral untuk menekan populasi kutu daun penular.",
      "Cabut tanaman bergejala dan musnahkan untuk mengurangi sumber penularan di dalam lahan.",
      "Tanam varietas melon yang toleran terhadap potyvirus jika tersedia di pasaran.",
    ],
    severity: "high",
  },

  // ──── NEMATODA (P15) ────────────────────────────────────────
  {
    id: "P15",
    name: "Nematoda Puru Akar (Root-Knot Nematode)",
    scientificName: "Meloidogyne incognita / M. javanica",
    symptoms: ["A02", "A01", "D06", "D04", "A03"],
    description:
      "Nematoda parasit akar berukuran mikroskopis yang menyebabkan pembengkakan atau puru (gall) pada sistem perakaran melon. Nematoda masuk ke jaringan akar dan membentuk sel raksasa (giant cell) yang mengganggu penyerapan air dan unsur hara. Tanaman yang terinfeksi menunjukkan klorosis, layu pada siang hari yang pulih di malam hari (reversible wilt), pertumbuhan kerdil, dan mudah tercabut karena akar rapuh. Populasi nematoda meningkat cepat di tanah berpasir dan bersuhu hangat. Pada pemeriksaan akar, terlihat benjolan/bintil abnormal.",
    recommendations: [
      "Lakukan rotasi tanaman dengan tanaman non-inang seperti tagetes (Tagetes erecta), jagung, atau rumput-rumputan selama 1–2 musim.",
      "Aplikasikan nematisida hayati berbahan Paecilomyces lilacinus atau Purpureocillium lilacinum ke lubang tanam sebelum penanaman.",
      "Tingkatkan bahan organik tanah (kompos matang atau pupuk kandang) untuk mendukung pertumbuhan mikroorganisme antagonis nematoda.",
      "Pada serangan berat, gunakan nematisida berbahan aktif karbofuran atau fostiazat sesuai dosis anjuran label.",
    ],
    severity: "medium",
  },

  // ──── HAMA SERANGGA (P16–P19) ──────────────────────────────
  {
    id: "P16",
    name: "Kutu Daun (Aphid)",
    scientificName: "Aphis gossypii",
    symptoms: ["S01", "S04", "S03", "D05", "D06"],
    description:
      "Serangga penghisap cairan tanaman berukuran kecil (1–2 mm) yang membentuk koloni padat di bawah permukaan daun muda dan pucuk pertumbuhan. Kutu daun menghisap cairan floem menyebabkan daun keriting, menguning, dan pertumbuhan terhambat. Kutu mengeluarkan embun madu (honeydew) yang menjadi media tumbuh cendawan jelaga hitam (sooty mold). Selain merusak langsung, kutu daun merupakan vektor utama penularan virus CMV, ZYMV, dan WMV pada tanaman melon dan cucurbit lainnya.",
    recommendations: [
      "Semprot insektisida berbahan aktif imidakloprid atau tiametoksam secara sistemik pada awal ditemukan koloni.",
      "Gunakan insektisida nabati (minyak neem 5 mL/L atau ekstrak bawang putih) sebagai alternatif untuk serangan ringan-sedang.",
      "Budidayakan musuh alami seperti kumbang koksi (Coccinellidae), lacewing (Chrysoperla), atau parasitoid Aphidius colemani.",
      "Pasang perangkap kuning lengket (yellow sticky trap) untuk monitoring populasi dan deteksi dini serangan.",
    ],
    severity: "medium",
  },
  {
    id: "P17",
    name: "Kutu Kebul (Whitefly)",
    scientificName: "Bemisia tabaci",
    symptoms: ["S02", "S04", "S03", "D06"],
    description:
      "Serangga kecil berwarna putih (1–1,5 mm) yang hidup di permukaan bawah daun dan berterbangan saat tanaman digoyangkan. Seperti kutu daun, kutu kebul menghisap cairan tanaman dan menghasilkan embun madu yang memicu pertumbuhan cendawan jelaga hitam. Serangan parah menyebabkan klorosis, daun menjadi keriput, dan pertumbuhan terlambat. Kutu kebul juga merupakan vektor penting begomovirus dan crinivirus yang dapat menyerang cucurbit. Populasi meledak pada musim kemarau.",
    recommendations: [
      "Pasang perangkap kuning lengket (yellow sticky trap) di antara barisan tanaman dengan kepadatan 20–40 per hektar untuk monitoring dan pengendalian langsung.",
      "Aplikasikan insektisida berbahan aktif spiromesifen atau siantraniliprol yang efektif terhadap telur dan nimfa kutu kebul.",
      "Gunakan mulsa plastik perak untuk mengusir kutu kebul melalui efek refleksi cahaya ultraviolet.",
      "Jaga kebersihan lahan dari gulma inang dan sisa tanaman terinfeksi yang menjadi sumber populasi.",
    ],
    severity: "medium",
  },
  {
    id: "P18",
    name: "Lalat Buah (Fruit Fly)",
    scientificName: "Bactrocera cucurbitae",
    symptoms: ["S06", "F07", "F02"],
    description:
      "Lalat buah melon berukuran sedang (6–8 mm) berwarna coklat kekuningan dengan sayap transparan. Lalat betina meletakkan telur di bawah kulit buah yang mulai matang dengan cara menusukkan ovipositor. Larva (belatung) menetas dan memakan daging buah dari dalam, menyebabkan buah membusuk sebelum matang dan akhirnya jatuh. Serangan biasanya tidak terlihat dari luar hingga buah dipotong. Hama ini sangat merusak pada pertanaman melon terbuka di daerah tropis sepanjang tahun.",
    recommendations: [
      "Pasang perangkap metil eugenol (ME trap) atau cue-lure di sekitar lahan untuk menarik dan membunuh lalat jantan sehingga mengurangi populasi.",
      "Bungkus buah dengan kertas koran atau kantong plastik berlubang setelah buah mencapai ukuran segenggaman tangan untuk mencegah peletakan telur.",
      "Kumpulkan dan musnahkan (kubur dalam) semua buah yang terserang atau jatuh busuk untuk memutus siklus hidup hama.",
      "Aplikasikan protein umpan beracun (protein bait spray) dicampur insektisida spinosad seminggu sekali pada fase pembuahan.",
    ],
    severity: "high",
  },
  {
    id: "P19",
    name: "Trips (Thrips)",
    scientificName: "Thrips palmi",
    symptoms: ["S05", "S03", "D05"],
    description:
      "Serangga bertubuh sangat kecil (1–1,5 mm) berwarna kuning pucat hingga coklat yang hidup di bunga, pucuk daun, dan permukaan bawah daun muda. Trips menghisap cairan sel epidermis daun menggunakan stilet, menyebabkan bercak perak atau perunggu (silver/bronze speckling) dan jaringan mengering. Pada serangan berat, daun menggulung atau keriting. Pada buah muda, bekas gigitan trips meninggalkan bekas luka (scarring) yang mengurangi kualitas penampilan buah. Trips berpotensi menularkan tospovirus. Populasinya meledak saat musim kering dan panas.",
    recommendations: [
      "Pasang perangkap biru lengket (blue sticky trap) di antara barisan tanaman — trips lebih tertarik warna biru dibandingkan kuning.",
      "Aplikasikan insektisida berbahan aktif spinosad atau abamektin yang efektif terhadap trips dewasa dan larva.",
      "Semprotkan insektisida nabati (ekstrak biji mimba/neem oil) sebagai alternatif pengendalian organik yang ramah lingkungan.",
      "Bersihkan gulma di sekitar lahan yang menjadi inang alternatif dan tempat berkembang biak trips.",
    ],
    severity: "medium",
  },
];

// ============================================================
// PERTANYAAN PEMBEDA — 8 Pertanyaan Kunci
//
// Pertanyaan ini diajukan oleh engine Forward Chaining di Step 3
// untuk menyempitkan kandidat penyakit yang gejalanya tumpang
// tindih. Engine hanya mengajukan pertanyaan yang targetDiseases-
// nya memiliki ≥2 kandidat aktif.
// ============================================================

export const differentiatingQuestions: DifferentiatingQuestion[] = [
  {
    id: "DQ01",
    question:
      "Ketika batang yang layu dipotong melintang, apakah terlihat perubahan warna coklat pada jaringan pembuluh (xylem) di dalamnya?",
    targetDiseases: ["P03", "P10", "P15"],
    yesSupports: ["P03"],
    noSupports: ["P10", "P15"],
  },
  {
    id: "DQ02",
    question:
      "Apakah tanaman layu secara permanen dan tidak pulih kembali meskipun disiram air atau menunggu hingga pagi hari?",
    targetDiseases: ["P03", "P10", "P15"],
    yesSupports: ["P03", "P10"],
    noSupports: ["P15"],
  },
  {
    id: "DQ03",
    question:
      "Coba potong batang yang layu, tempelkan kedua ujung potongan, lalu tarik perlahan. Apakah terlihat benang atau lendir putih susu yang ikut tertarik di antara kedua potongan?",
    targetDiseases: ["P03", "P10"],
    yesSupports: ["P10"],
    noSupports: ["P03"],
  },
  {
    id: "DQ04",
    question:
      "Pada saat pagi hari atau udara lembap, apakah terlihat lapisan spora berwarna keunguan atau abu-abu di permukaan bawah daun (tepat di bawah bercak)?",
    targetDiseases: ["P01", "P11", "P06"],
    yesSupports: ["P01"],
    noSupports: ["P11", "P06"],
  },
  {
    id: "DQ05",
    question:
      "Apakah bercak pada daun memiliki pola cincin konsentris yang jelas (lingkaran berlapis di dalam bercak) menyerupai papan target/sasaran?",
    targetDiseases: ["P05", "P07", "P06"],
    yesSupports: ["P07"],
    noSupports: ["P06"],
  },
  {
    id: "DQ06",
    question:
      "Apakah daun yang terinfeksi menjadi sangat sempit dan memanjang (bentuknya menyerupai tali sepatu), bukan sekadar menggulung biasa?",
    targetDiseases: ["P12", "P13", "P14"],
    yesSupports: ["P12"],
    noSupports: ["P13", "P14"],
  },
  {
    id: "DQ07",
    question:
      "Apakah buah yang terbentuk menunjukkan permukaan yang benjol-benjol (knobby) atau jaring kulit (netting) yang sangat tidak rata?",
    targetDiseases: ["P12", "P13", "P14"],
    yesSupports: ["P13"],
    noSupports: ["P12", "P14"],
  },
  {
    id: "DQ08",
    question:
      "Apakah batang yang sakit mengeluarkan cairan atau getah (eksudat) berwarna coklat kemerahan yang mengental di permukaan batang?",
    targetDiseases: ["P04", "P05"],
    yesSupports: ["P04"],
    noSupports: ["P05"],
  },
];
