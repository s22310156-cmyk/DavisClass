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
    topArtists: [],
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
    // Data Cleaning Super Ketat (Membuang ID Spotify yang nyasar)
    const cleanData = rawData.filter((item) => {
      if (!item.track_name || !item.artist_name) return false;
      const artist = item.artist_name.replace(/['"]/g, "").trim();
      const isCorruptedID = /[a-zA-Z0-9]{20,}/.test(artist);
      return !isCorruptedID;
    });

    setData(cleanData);

    let totalPopularity = 0;
    const artistsSet = new Set();
    const artistDetailsMap = new Map();
    const yearCounts = {};
    const genreCounts = {};
    const albumTypeCounts = {};
    const scatterData = [];

    cleanData.forEach((item) => {
      const pop = parseInt(item.track_popularity) || 0;
      const dur = parseFloat(item.track_duration_min) || 0;
      const artistName = item.artist_name.replace(/['"]/g, "").trim();
      const followers = parseInt(item.artist_followers) || 0;
      const artistPop = parseInt(item.artist_popularity) || 0;

      totalPopularity += pop;
      artistsSet.add(artistName);

      if (!artistDetailsMap.has(artistName)) {
        artistDetailsMap.set(artistName, {
          name: artistName,
          followers,
          popularity: artistPop,
        });
      } else {
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
      topArtists: topArtistsData,
    });
  };

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
        <div className="bg-[#181818] border border-[#282828] p-3 rounded-xl shadow-xl">
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
        <div className="mb-8 bg-[#181818]/80 backdrop-blur-xl p-6 rounded-3xl border border-[#282828] shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-center">
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
              className="bg-[#181818] p-6 rounded-2xl border border-[#282828] shadow-lg hover:border-[#1DB954]/50 transition duration-300 group"
            >
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                {item.title}
              </p>
              <p className={`text-3xl font-black ${item.color} truncate`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* --- Top Artis Section --- */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-gray-200 mb-5 tracking-widest uppercase flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#1DB954]"></span>
            Top Artis dengan Follower Terbanyak
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {chartsData.topArtists.map((artist, idx) => (
              <div
                key={idx}
                className="bg-[#181818] p-5 rounded-2xl border border-[#282828] hover:border-[#1DB954] hover:bg-[#222222] transition-colors group flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[#282828] flex items-center justify-center text-xl font-black text-white mb-3 group-hover:text-[#1DB954] transition-colors">
                  {artist.name.substring(0, 2).toUpperCase()}
                </div>
                <h4 className="font-bold text-white text-sm truncate w-full mb-1">
                  {artist.name}
                </h4>
                <p className="text-[#1DB954] text-xs font-bold mb-4">
                  {formatNumber(artist.followers)}{" "}
                  <span className="text-gray-500 font-normal">Followers</span>
                </p>
                <div className="w-full bg-[#121212] rounded-xl p-2 mt-auto border border-[#282828]">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">
                    Skor Popularitas
                  </p>
                  <p className="text-white font-bold text-sm">
                    {artist.popularity}{" "}
                    <span className="text-gray-600 text-xs">/ 100</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Charts Area --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-[#181818] p-6 rounded-2xl border border-[#282828] shadow-lg">
            <h2 className="text-sm font-bold text-gray-200 mb-6 tracking-widest uppercase">
              Tren Rilis Sepanjang Masa
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartsData.line}>
                  <defs>
                    <linearGradient id="neonGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DB954" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1DB954" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#282828"
                  />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a7a7a7", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a7a7a7", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#181818",
                      borderColor: "#282828",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#1DB954" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalRilis"
                    stroke="#1DB954"
                    strokeWidth={3}
                    fill="url(#neonGreen)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#181818] p-6 rounded-2xl border border-[#282828] shadow-lg">
            <h2 className="text-sm font-bold text-gray-200 mb-6 tracking-widest uppercase text-center">
              Format Distribusi
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData.albumPie}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    stroke="none"
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
                      backgroundColor: "#181818",
                      borderColor: "#282828",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ color: "#a7a7a7", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#181818] p-6 rounded-2xl border border-[#282828] shadow-lg">
            <h2 className="text-sm font-bold text-gray-200 mb-6 tracking-widest uppercase">
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
                    stroke="#282828"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a7a7a7" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#e5e7eb",
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "#282828" }}
                    contentStyle={{
                      backgroundColor: "#181818",
                      borderColor: "#282828",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="jumlah"
                    fill="#06b6d4"
                    radius={[0, 4, 4, 0]}
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

          <div className="bg-[#181818] p-6 rounded-2xl border border-[#282828] shadow-lg">
            <h2 className="text-sm font-bold text-gray-200 mb-2 tracking-widest uppercase">
              Korelasi: Durasi vs Popularitas
            </h2>
            <p className="text-xs text-gray-500 mb-4 pl-6">
              Analisis pola durasi hit lagu (Sampel acak)
            </p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
                  <XAxis
                    type="number"
                    dataKey="duration"
                    name="Durasi"
                    unit=" mnt"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a7a7a7" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="popularity"
                    name="Popularitas"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a7a7a7" }}
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

        {/* --- Papan Peringkat Tabel --- */}
        <div className="bg-[#181818] rounded-2xl border border-[#282828] shadow-xl overflow-hidden mb-10">
          <div className="p-6 border-b border-[#282828] flex items-center gap-3">
            <h2 className="text-sm font-bold text-gray-200 tracking-widest uppercase">
              Papan Peringkat (Top 15 Terpopuler)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#121212] text-gray-400">
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
              <tbody className="divide-y divide-[#282828]">
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
                        className="hover:bg-[#222222] transition-colors group"
                      >
                        <td className="px-6 py-4 text-center">
                          <span className="text-[#a7a7a7] font-bold text-lg">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-white truncate max-w-[250px]">
                            {row.track_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[250px]">
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
                            <div className="w-16 h-1.5 bg-[#282828] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1DB954]"
                                style={{ width: `${pop}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#a7a7a7]">
                          {parseFloat(row.track_duration_min).toFixed(2)} mnt
                        </td>
                        <td className="px-6 py-4">
                          {isExplicit ? (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                              Explicit
                            </span>
                          ) : (
                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
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

        {/* --- SEKSI BARU: EXECUTIVE INSIGHTS (DIPINDAH KE BAWAH) --- */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-gray-200 mb-5 tracking-widest uppercase flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#1DB954]"></span>
            Analitik Strategis & Insight Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card Insight 1 */}
            <div className="bg-[#181818] p-6 rounded-2xl border border-[#282828] hover:bg-[#222222] transition-colors group flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 flex items-center justify-center border border-[#1DB954]/20 group-hover:bg-[#1DB954]/20 transition-colors">
                  <svg
                    className="w-5 h-5 text-[#1DB954]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">
                    Insight Utama
                  </p>
                  <h3 className="font-bold text-white text-sm">
                    Dominasi Taylor Swift & Pop
                  </h3>
                </div>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Taylor Swift adalah market leader dengan jumlah pengikut
                tertinggi (145.5M) dan skor popularitas sempurna (100/100). Hal
                ini secara langsung mengerek genre Pop dan Country menjadi
                kategori paling dominan dalam ekosistem data ini.
              </p>
            </div>

            {/* Card Insight 2 */}
            <div className="bg-[#181818] p-6 rounded-2xl border border-[#282828] hover:bg-[#222222] transition-colors group flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#06b6d4]/10 flex items-center justify-center border border-[#06b6d4]/20 group-hover:bg-[#06b6d4]/20 transition-colors">
                  <svg
                    className="w-5 h-5 text-[#06b6d4]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    ></path>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">
                    Tren Data
                  </p>
                  <h3 className="font-bold text-white text-sm">
                    Pertumbuhan Eksponensial
                  </h3>
                </div>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Grafik tren rilis menunjukkan lonjakan produksi musik yang
                drastis pasca-2010. Hal ini menandakan era digitalisasi
                streaming di mana volume lagu baru yang masuk ke platform
                meningkat ribuan persen dibanding dekade sebelumnya.
              </p>
            </div>

            {/* Card Insight 3 */}
            <div className="bg-[#181818] p-6 rounded-2xl border border-[#282828] hover:bg-[#222222] transition-colors group flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#ec4899]/10 flex items-center justify-center border border-[#ec4899]/20 group-hover:bg-[#ec4899]/20 transition-colors">
                  <svg
                    className="w-5 h-5 text-[#ec4899]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">
                    Rekomendasi Produksi
                  </p>
                  <h3 className="font-bold text-white text-sm">
                    Optimasi Durasi 3 Menit
                  </h3>
                </div>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Untuk memaksimalkan peluang lagu menjadi "hits", targetkan
                durasi lagu di rentang 3.00 hingga 3.50 menit. Scatter plot
                visualisasi mengonfirmasi bahwa konsentrasi popularitas
                tertinggi menumpuk tajam pada rentang durasi tersebut.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
