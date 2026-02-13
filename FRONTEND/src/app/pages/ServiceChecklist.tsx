import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Search, Check, X, Calendar } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { checklistAPI, activityAPI } from "../../api";

interface ServiceChecklistProps {
  onLogout: () => void;
  onBack: () => void;
  hangerNo?: number | null;
  onSubmitSuccess?: () => void;
}

interface ChecklistItem {
  sr: number;
  activity: string;
  status: "pending" | "done" | "failed";
  remarks: string;
  standardValue: string;
  image?: string;
}

export function ServiceChecklist({
  onLogout,
  onBack,
  hangerNo,
  onSubmitSuccess,
}: ServiceChecklistProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHanger, setSelectedHanger] = useState<number | null>(null);
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>([]);
  const [doneBy, setDoneBy] = useState("");
  const [doneOn, setDoneOn] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalHangers = 114;

  const serviceConditions = [
    "No loose wear out & Damage",
    "No Wear out & Damage",
    "Tight",
    "Tight & No broken",
    "No loose & No Damage",
    "Tight & No play in key",
    "No loose & No loose",
    "Tight and Tight",
  ];

  // Auto-load checklist when hangerNo prop is provided or changes
  useEffect(() => {
    if (hangerNo) {
      setSelectedHanger(hangerNo);
      loadChecklistData(hangerNo);
    }
  }, [hangerNo]);

  // Handle viewport resize
  useEffect(() => {
    const handleResize = () => {
      setHoveredImage(null);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const loadChecklistData = async (hanger: number) => {
    setIsLoading(true);
    try {
      const response = await checklistAPI.getForHanger(hanger);
      if (response.success) {
        setChecklistData(
          response.data.checklist.map((item: any) => ({
            sr: item.sr_no,
            activity: item.activity,
            status: item.status,
            remarks: item.remarks || "",
            standardValue: item.standard_value || "",
            image: item.image || "",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch checklist:", err);
      // Fallback to default checklist
      setChecklistData([
        {
          sr: 1,
          activity: "Visual Inspection",
          status: "pending",
          remarks: "",
          standardValue: "No loose wear out & Damage",
          image: "",
        },
        {
          sr: 2,
          activity: "Check Hook Integrity",
          status: "pending",
          remarks: "",
          standardValue: "No Wear out & Damage",
          image: "",
        },
        {
          sr: 3,
          activity: "Lubrication",
          status: "pending",
          remarks: "",
          standardValue: "Tight",
          image: "",
        },
        {
          sr: 4,
          activity: "Paint Touch-up",
          status: "pending",
          remarks: "",
          standardValue: "Tight & No broken",
          image: "",
        },
        {
          sr: 5,
          activity: "Barcode Verification",
          status: "pending",
          remarks: "",
          standardValue: "No loose & No Damage",
          image: "",
        },
        {
          sr: 6,
          activity: "Weight Capacity Test",
          status: "pending",
          remarks: "",
          standardValue: "Tight & No play in key",
          image: "",
        },
        {
          sr: 7,
          activity: "Chain/Cable Check",
          status: "pending",
          remarks: "",
          standardValue: "No loose & No loose",
          image: "",
        },
        {
          sr: 8,
          activity: "Safety Lock Inspection",
          status: "pending",
          remarks: "",
          standardValue: "Tight and Tight",
          image: "",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
    setDoneBy("");
    setDoneOn("");
  };

  // Filter hangers based on search
  const filteredHangers = searchTerm
    ? Array.from({ length: totalHangers }, (_, i) => i + 1).filter((num) =>
        num.toString().includes(searchTerm)
      )
    : [];

  const handleHangerSelect = async (hangerNo: number) => {
    setSelectedHanger(hangerNo);
    await loadChecklistData(hangerNo);
  };

  const handleStatusChange = (sr: number, status: "done" | "failed") => {
    setChecklistData((prev) =>
      prev.map((item) => (item.sr === sr ? { ...item, status } : item))
    );
  };

  const handleRemarksChange = (sr: number, remarks: string) => {
    setChecklistData((prev) =>
      prev.map((item) => (item.sr === sr ? { ...item, remarks } : item))
    );
  };

  const handleStandardValueChange = (sr: number, standardValue: string) => {
    setChecklistData((prev) =>
      prev.map((item) => (item.sr === sr ? { ...item, standardValue } : item))
    );
  };

  const handleSubmit = async () => {
    if (!doneBy || !doneOn) {
      alert("Please fill in 'Done By' and 'Done On' fields");
      return;
    }

    // Additional validation for date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doneOn)) {
      alert("Invalid date format. Please select a valid date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const checklistPayload = checklistData.map((item) => ({
        sr_no: item.sr,
        activity: item.activity,
        status: item.status,
        remarks: item.remarks,
      }));

      const response = await checklistAPI.save(
        selectedHanger!,
        checklistPayload,
        doneBy,
        doneOn
      );

      if (response.success) {
        alert(`Checklist submitted successfully for Hanger ${selectedHanger}`);
        // Reset form
        setSelectedHanger(null);
        setSearchTerm("");
        setChecklistData([]);
        setDoneBy("");
        setDoneOn("");
        // Call onSubmitSuccess callback if provided
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      }
    } catch (err: any) {
      alert(
        err.message ||
          "Failed to submit checklist. Please ensure the date is valid."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar onLogout={onLogout} title="EMS Hanger" showUsersButton={false} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-6 md:py-8 pt-16 md:pt-20"
      >
        {/* Title */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Service Checklist
          </h1>
          <button
            onClick={onBack}
            className="text-[#0b5d3b] hover:underline font-medium"
          >
            ← Back to Hanger Servicing
          </button>
        </div>

        {/* Hanger Search Section */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              Hanger No. (Total: {totalHangers})
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type hanger number (e.g., 1, 12, 122)..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0b5d3b] focus:outline-none text-lg"
              />
            </div>

            {/* Search Results Dropdown */}
            {searchTerm && filteredHangers.length > 0 && (
              <div className="mt-3 border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
                {filteredHangers.map((hangerNo) => (
                  <div
                    key={hangerNo}
                    onClick={() => handleHangerSelect(hangerNo)}
                    className="px-4 py-3 hover:bg-[#0b5d3b] hover:text-white cursor-pointer transition-colors border-b last:border-b-0"
                  >
                    Hanger {hangerNo}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Checklist Table */}
        {selectedHanger && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto"
          >
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Hanger {selectedHanger} - Service Checklist
              </h2>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#0b5d3b] text-white">
                      <th className="border border-gray-300 px-4 py-3 text-left">
                        SR
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left">
                        Activity
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left">
                        Standard Value
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center">
                        Image
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left">
                        Status
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left">
                        Remarks
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center">
                        Done
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistData.map((item) => (
                      <tr key={item.sr} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 font-semibold">
                          {item.sr}
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          {item.activity}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 font-medium text-gray-700">
                          {item.standardValue}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          {item.image ? (
                            <div
                              onMouseEnter={() => {
                                if (hoverTimeoutRef.current)
                                  clearTimeout(hoverTimeoutRef.current);
                                setHoveredImage(item.image || null);
                              }}
                              onMouseLeave={() => {
                                hoverTimeoutRef.current = setTimeout(() => {
                                  setHoveredImage(null);
                                }, 100);
                              }}
                              className="inline-block"
                            >
                              <img
                                src={item.image}
                                alt="Inspection"
                                className="w-12 h-12 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              No image
                            </span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              item.status === "done"
                                ? "bg-green-100 text-green-800"
                                : item.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item.status === "done"
                              ? "Done"
                              : item.status === "failed"
                              ? "Failed"
                              : "Pending"}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) =>
                              handleRemarksChange(item.sr, e.target.value)
                            }
                            placeholder="Add remarks..."
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:border-[#0b5d3b] focus:outline-none"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() =>
                                handleStatusChange(item.sr, "done")
                              }
                              className={`p-2 rounded-lg transition-all ${
                                item.status === "done"
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-200 text-gray-600 hover:bg-green-100"
                              }`}
                              title="Mark as Done"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(item.sr, "failed")
                              }
                              className={`p-2 rounded-lg transition-all ${
                                item.status === "failed"
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-200 text-gray-600 hover:bg-red-100"
                              }`}
                              title="Mark as Failed"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Section */}
              <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                {/* Submit Button - Left */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#0b5d3b] text-white text-lg font-semibold rounded-xl hover:bg-[#0a4d30] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>

                {/* Done By and Done On - Right */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Done By
                    </label>
                    <input
                      type="text"
                      value={doneBy}
                      onChange={(e) => setDoneBy(e.target.value)}
                      placeholder="Enter name..."
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0b5d3b] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Done On
                    </label>
                    <input
                      type="date"
                      value={doneOn}
                      onChange={(e) => setDoneOn(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-[#0b5d3b] focus:outline-none cursor-pointer text-gray-700 bg-white hover:border-[#0b5d3b] transition-colors"
                      style={{ colorScheme: "light" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* No Hanger Selected Message */}
        {!selectedHanger && (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-lg">
              Please search and select a hanger to view the checklist
            </p>
          </div>
        )}

        {/* Image Preview Card on Hover */}
        {hoveredImage && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => {
                setHoveredImage(null);
              }, 100);
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="bg-transparent rounded-lg shadow-2xl p-6 max-w-4xl w-11/12 sm:max-w-3xl pointer-events-auto"
            >
              <img
                src={hoveredImage}
                alt="Preview"
                className="w-full h-auto rounded-lg object-cover max-h-[600px]"
              />
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
