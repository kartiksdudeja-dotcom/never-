import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Navbar } from "../components/Navbar";
import { hangersAPI } from "../../api";

interface WheelCompletionProps {
  onLogout: () => void;
  onNext: () => void;
  onBack: () => void;
  onStartChecklist?: () => void;
  onHangerClick?: (hangerNo: number) => void;
  submissionTrigger?: number;
}

interface HangerData {
  id: number;
  hanger_no: number;
  status: "done" | "needed" | "none";
}

export function WheelCompletion({
  onLogout,
  onNext,
  onBack,
  onStartChecklist,
  onHangerClick,
  submissionTrigger,
}: WheelCompletionProps) {
  const [hangerData, setHangerData] = useState<HangerData[]>([]);
  const [stats, setStats] = useState({
    done: 0,
    needed: 0,
    none: 0,
    total: 114,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when submission trigger changes
  useEffect(() => {
    if (submissionTrigger && submissionTrigger > 0) {
      fetchData();
    }
  }, [submissionTrigger]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsResponse, hangersResponse] = await Promise.all([
        hangersAPI.getStats(),
        hangersAPI.getAll(),
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (hangersResponse.success) {
        const hangerList = hangersResponse.data.map((hanger: any) => ({
          id: hanger.id,
          hanger_no: hanger.hanger_no,
          status: hanger.status,
        }));
        setHangerData(hangerList);
      }
    } catch (err) {
      console.error("Failed to fetch completion data:", err);
      // Generate default data
      const defaultData: HangerData[] = Array.from({ length: 114 }, (_, i) => ({
        id: i + 1,
        hanger_no: i + 1,
        status: i % 3 === 0 ? "done" : i % 3 === 1 ? "needed" : "none",
      }));
      setHangerData(defaultData);
    } finally {
      setIsLoading(false);
    }
  };

  const pieData = [
    { name: "Completed", value: stats.done, color: "#10b981" },
    { name: "Hangers With Abnormality", value: stats.needed, color: "#ef4444" },
    { name: "Service Pending", value: stats.none, color: "#ffffff" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-500";
      case "needed":
        return "bg-red-500";
      case "none":
        return "bg-white border-2 border-gray-300";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar onLogout={onLogout} title="EMS Hanger" showUsersButton={false} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-6 md:py-8 pt-20 md:pt-24"
      >
        {/* Title */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            Wheel Completion Status
          </h1>
          <button
            onClick={onBack}
            className="mt-2 text-[#0b5d3b] hover:underline font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Horizontal Layout: Pie Chart (Left) + Grid (Right) */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8 max-w-7xl mx-auto">
          {/* Left Side - Pie Chart */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full md:w-2/5 bg-white rounded-2xl shadow-lg p-6 flex flex-col"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 text-center">
              Status Overview
            </h2>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={
                          entry.color === "#ffffff" ? "#d1d5db" : entry.color
                        }
                        strokeWidth={entry.color === "#ffffff" ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Statistics Below Pie Chart */}
            <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Completed
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-800">
                  {stats.done}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Hangers With Abnormality
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-800">
                  {stats.needed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Service Pending
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-800">
                  {stats.none}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-800">
                    Total Hangers
                  </span>
                  <span className="text-xl font-bold text-[#0b5d3b]">
                    {stats.total}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Hanger Grid */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full md:w-3/5 bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 text-center">
              Hanger Status Grid
            </h2>

            {/* Grid */}
            <div className="grid grid-cols-7 md:grid-cols-14 gap-2 mb-6 max-h-[400px] overflow-y-auto">
              {hangerData.map((hanger) => (
                <div
                  key={hanger.id}
                  onClick={() =>
                    hanger.status === "needed" &&
                    onHangerClick?.(hanger.hanger_no)
                  }
                  className={`${getStatusColor(
                    hanger.status
                  )} rounded-lg p-2 md:p-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow ${
                    hanger.status === "needed"
                      ? "cursor-pointer hover:scale-110"
                      : "cursor-pointer"
                  }`}
                  title={`Hanger ${hanger.hanger_no} - ${hanger.status}`}
                >
                  <span className="text-xs md:text-sm font-bold text-gray-800">
                    {hanger.hanger_no}
                  </span>
                </div>
              ))}
            </div>

            {/* Not OK Section */}
            {hangerData.some((h) => h.status === "needed") && (
              <div className="mb-6 border-t pt-6">
                <h3 className="text-lg font-bold text-red-600 mb-4">
                  Hangers With Abnormality
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {hangerData
                    .filter((h) => h.status === "needed")
                    .map((hanger) => (
                      <div
                        key={hanger.id}
                        onClick={() => onHangerClick?.(hanger.hanger_no)}
                        className="bg-red-500 rounded-lg p-2 md:p-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:scale-110 transition-all cursor-pointer"
                        title={`Click to view Hanger ${hanger.hanger_no} checklist`}
                      >
                        <span className="text-xs md:text-sm font-bold text-white">
                          {hanger.hanger_no}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Color Legend */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-emerald-500 rounded"></div>
                <span className="text-sm md:text-base text-gray-700">
                  Completed
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded"></div>
                <span className="text-sm md:text-base text-gray-700">
                  Hangers With Abnormality
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded"></div>
                <span className="text-sm md:text-base text-gray-700">
                  Service Pending
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-between max-w-6xl mx-auto">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            onClick={onStartChecklist}
            className="px-8 py-3 md:px-10 md:py-4 bg-[#0b5d3b] text-white text-lg font-semibold rounded-xl hover:bg-[#0a4d30] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            Start Checklist
          </motion.button>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            onClick={onNext}
            className="px-8 py-3 md:px-10 md:py-4 bg-[#0b5d3b] text-white text-lg font-semibold rounded-xl hover:bg-[#0a4d30] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            Next →
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
