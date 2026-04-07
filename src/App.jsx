import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

const COLORS = [
  "#1DB954",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
];

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({
    total: 0,
    uniqueArtists: 0,
    avgPopularity: 0,
    topGenre: "",
  });
  const [chartsData, setChartsData] = useState({
    line: [],
    genreBar: [],
    albumPie: [],
    scatter: [],
    topArtists: [], // Tambahan state untuk Top Artis
  });

  useEffect(() => {
    fetch("/spotify_data clean.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Gagal memuat file CSV");
        return response.text();
      })
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          quoteChar: '"',
          escapeChar: '"',
          complete: (results) => {
            processData(results.data);
            setLoading(false);
          },
        });
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const processData = (rawData) => {
    // Data Cleaning
    const cleanData = rawData.filter((item) => {
      if (!item.track_name || !item.artist_name) return false;
      const artist = item.artist_name.trim();
      const isCorruptedID = /^[a-zA-Z0-9]{22}$/.test(artist);
      return !isCorruptedID;
    });

    setData(cleanData);

    let totalPopularity = 0;
    const artistsSet = new Set();
    const artistDetailsMap = new Map(); // Untuk menyimpan data follower artis
    const yearCounts = {};
    const genreCounts = {};
    const albumTypeCounts = {};
    const scatterData = [];

    cleanData.forEach((item) => {
      const pop = parseInt(item.track_popularity) || 0;
      const dur = parseFloat(item.track_duration_min) || 0;
      const artistName = item.artist_name.trim();
      const followers = parseInt(item.artist_followers) || 0;
      const artistPop = parseInt(item.artist_popularity) || 0;

      totalPopularity += pop;
      artistsSet.add(artistName);

      // --- LOGIKA MENGAMBIL DATA TOP ARTIS ---
      if (!artistDetailsMap.has(artistName)) {
        artistDetailsMap.set(artistName, { name: artistName, followers, popularity: artistPop });
      } else {
        // Update jika ada data follower yang lebih tinggi di baris lain
        if (followers > artistDetailsMap.get(artistName).followers) {
          artistDetailsMap.get(artistName).followers = followers;
        }
      }

      if (item.album_release_date) {
        const year = item.album_release_date.substring(0, 4);
        if (year >= 1950 && year <= 2026) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      }

      const aType = item.album_type || "Unknown";
      albumTypeCounts[aType] = (albumTypeCounts[aType] || 0) + 1;

      if (item.artist_genres && item.artist_genres !== "N/A") {
        const genres = item.artist_genres
          .split(",")
          .map((g) => g.trim().toLowerCase());
        genres.forEach((g) => {
          if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }

      if (Math.random() < 0.1 && pop > 0 && dur > 0 && dur < 10) {
        scatterData.push({
          popularity: pop,
          duration: dur,
          name: item.track_name,
        });
      }
    });

    const validLength = cleanData.length;

    // Sort dan Ambil 6 Artis dengan Follower Tertinggi
    const topArtistsData = Array.from(artistDetailsMap.values())
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 6);

    const lineData = Object.keys(yearCounts)
      .map((year) => ({ year, totalRilis: yearCounts[year] }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const genreBarData = Object.keys(genreCounts)
      .map((name) => ({ name, jumlah: genreCounts[name] }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 7);

    const topGenreText = genreBarData.length > 0 ? genreBarData[0].name : "N/A";

    const albumPieData = Object.keys(albumTypeCounts).map((type) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: albumTypeCounts[type],
    }));

    setKpi({
      total: validLength,
      uniqueArtists: artistsSet.size,
      avgPopularity:
        validLength > 0 ? (totalPopularity / validLength).toFixed(1) : 0,
      topGenre: topGenreText.replace(/\b\w/g, (l) => l.toUpperCase()),
    });

    setChartsData({
      line: lineData,
      genreBar: genreBarData,
      albumPie: albumPieData,
      scatter: scatterData,
      topArtists: topArtistsData, // Simpan ke state
    });
  };

  // Fungsi utilitas untuk memformat angka jadi 1.5M atau 500K
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-white/10 border-t-[#1DB954] rounded-full animate-spin mb-6 shadow-[0_0_15px_#1DB954]"></div>
        <p className="text-xl font-bold tracking-widest text-[#1DB954] animate-pulse">
          MEMUAT TRACKS...
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/80 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-xl">
          <p className="text-[#1DB954] font-bold mb-1">{data.name}</p>
          <p className="text-white text-sm">Popularitas: {data.popularity}</p>
          <p className="text-white text-sm">
            Durasi: {data.duration.toFixed(2)} Menit
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#1DB954]/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* --- Header --- */}
        <div className="mb-8 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-center shadow-[0_0_15px_rgba(29,185,84,0.3)]">
              <svg
                className="w-8 h-8 text-[#1DB954]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.745 3.808-.87 7.076-.496 9.712 1.115.293.18.386.563.207.856zm1.268-2.838c-.225.368-.705.483-1.072.258-2.686-1.65-6.784-2.13-9.965-1.166-.413.127-.85-.106-.975-.52-.126-.413.106-.85.52-.974 3.65-1.11 8.19-.58 11.235 1.295.367.225.483.704.257 1.072zm.106-2.964C14.73 8.71 9.352 8.498 5.438 9.687c-.494.15-1.015-.128-1.166-.623-.15-.495.128-1.015.623-1.166 4.49-1.364 10.435-1.11 14.246 1.15.442.26.586.837.324 1.28-.26.442-.837.586-1.28.324z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
                Data<span className="text-[#1DB954]">Pulse</span> Spotify
              </h1>
              <p className="text-gray-400 font-medium text-sm mt-1">
                Dashboard Analitik Musik Interaktif
              </p>
            </div>
          </div>
        </div>

        {/* --- KPI Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Lagu Valid",
              value: kpi.total.toLocaleString("id-ID"),
              color: "text-white",
            },
            {
              title: "Artis Unik",
              value: kpi.uniqueArtists.toLocaleString("id-ID"),
              color: "text-[#06b6d4]",
            },
            {
              title: "Rata-Rata Popularitas",
              value: `${kpi.avgPopularity}`,
              color: "text-[#1DB954]",
            },
            {
              title: "Genre Terbanyak",
              value: kpi.topGenre,
              color: "text-[#8b5cf6]",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-lg hover:bg-white/10 transition duration-300 group"
            >
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                {item.title}
              </p>
              <p
                className={`text-3xl font-black ${item.color} drop-shadow-md truncate`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* --- SECTION BARU: TOP ARTIST CARDS --- */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#1DB954] shadow-[0_0_8px_#1DB954]"></span>
            Top Artis dengan Follower Terbanyak
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {chartsData.topArtists.map((artist, idx) => (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-lg hover:bg-white/10 hover:-translate-y-1 transition duration-300 group flex flex-col items-center text-center"
              >
                {/* Avatar Initial Bulat */}
                <div className="w-16 h-16 rounded-full bg-[#181818] border-2 border-white/10 flex items-center justify-center text-xl font-black text-white mb-3 group-hover:border-[#1DB954] transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  {artist.name.substring(0, 2).toUpperCase()}
                </div>
                
                {/* Info Artis */}
                <h4 className="font-bold text-white text-sm truncate w-full mb-1">
                  {artist.name}
                </h4>
                <p className="text-[#1DB954] text-xs font-bold mb-4">
                  {formatNumber(artist.followers)}{" "}
                  <span className="text-gray-400 font-normal">Followers</span>
                </p>

                {/* Popularity Badge */}
                <div className="w-full bg-black/40 rounded-xl p-2 mt-auto border border-white/5">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">
                    Skor Popularitas
                  </p>
                  <p className="text-white font-bold text-sm">
                    {artist.popularity} <span className="text-gray-500 text-xs">/ 100</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Charts Area --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#1DB954] shadow-[0_0_8px_#1DB954]"></span>{" "}
              Tren Rilis Sepanjang Masa
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartsData.line}>
                  <defs>
                    <linearGradient id="neonGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DB954" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#1DB954" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#ffffff15"
                  />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#000000CC",
                      borderColor: "#ffffff20",
                      borderRadius: "10px",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#1DB954" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalRilis"
                    stroke="#1DB954"
                    strokeWidth={4}
                    fill="url(#neonGreen)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]"></span>{" "}
              Format Distribusi
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData.albumPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    stroke="none"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartsData.albumPie.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#000000CC",
                      borderColor: "#ffffff20",
                      borderRadius: "10px",
                      color: "#fff",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#06b6d4] shadow-[0_0_8px_#06b6d4]"></span>{" "}
              Dominasi Genre (Top 7)
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartsData.genreBar}
                  layout="vertical"
                  margin={{ left: 40, right: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#ffffff15"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#f3f4f6",
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "#ffffff10" }}
                    contentStyle={{
                      backgroundColor: "#000000CC",
                      borderColor: "#ffffff20",
                      borderRadius: "10px",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="jumlah"
                    fill="#06b6d4"
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                  >
                    {chartsData.genreBar.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#ec4899] shadow-[0_0_8px_#ec4899]"></span>{" "}
              Korelasi: Durasi vs Popularitas
            </h2>
            <p className="text-xs text-gray-400 mb-4 pl-6">
              Menganalisis pola durasi lagu hit (Sampel acak)
            </p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis
                    type="number"
                    dataKey="duration"
                    name="Durasi"
                    unit=" mnt"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="popularity"
                    name="Popularitas"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <ZAxis type="number" range={[50, 50]} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: "3 3" }}
                  />
                  <Scatter
                    data={chartsData.scatter}
                    fill="#ec4899"
                    opacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- Papan Peringkat Tabel Glassmorphism --- */}
        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 shadow-xl overflow-hidden mb-10">
          <div className="p-6 border-b border-white/10 bg-white/5 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]"></span>
            <h2 className="text-xl font-bold text-white">
              Papan Peringkat Trek (Top 15 Terpopuler)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-black/20 text-gray-400">
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs w-10 text-center">
                    #
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                    Trek & Album
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                    Artis
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                    Indeks Popularitas
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                    Durasi
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                    Label
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data
                  .sort(
                    (a, b) =>
                      (parseInt(b.track_popularity) || 0) -
                      (parseInt(a.track_popularity) || 0),
                  )
                  .slice(0, 15)
                  .map((row, index) => {
                    const pop = parseInt(row.track_popularity) || 0;
                    const isExplicit =
                      row.explicit === "TRUE" || row.explicit === "true";

                    return (
                      <tr
                        key={index}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-500 font-bold text-lg">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-white truncate max-w-[250px]">
                            {row.track_name}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[250px]">
                            {row.album_name}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-medium">
                          {row.artist_name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold w-6">
                              {pop}
                            </span>
                            <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1DB954]"
                                style={{ width: `${pop}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {parseFloat(row.track_duration_min).toFixed(2)} mnt
                        </td>
                        <td className="px-6 py-4">
                          {isExplicit ? (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                              Explicit
                            </span>
                          ) : (
                            <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                              Clean
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}