import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { checklistAPI } from "../../api";

interface ChecklistItem {
  id: number;
  sr_no: number;
  activity: string;
  standard_value?: string;
  image?: string;
}

interface ChecklistItemsManagerProps {
  onBack: () => void;
  onLogout: () => void;
}

export function ChecklistItemsManager({
  onBack,
  onLogout,
}: ChecklistItemsManagerProps) {
  const [activeTab, setActiveTab] = useState<
    "service" | "barcode" | "wheel" | "checkingList"
  >("service");
  const [serviceItems, setServiceItems] = useState<ChecklistItem[]>([]);
  const [barcodeItems, setBarcodeItems] = useState<ChecklistItem[]>([]);
  const [wheelItems, setWheelItems] = useState<ChecklistItem[]>([]);
  const [checkingListItems, setCheckingListItems] = useState<ChecklistItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editingItem, setEditingItem] = useState<{
    id: number;
    type: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editStandardValue, setEditStandardValue] = useState("");
  const [editImage, setEditImage] = useState("");
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add new item state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemActivity, setNewItemActivity] = useState("");
  const [newItemStandardValue, setNewItemStandardValue] = useState("");

  const standardValueOptions = [
    "No loose wear out & Damage",
    "No Wear out & Damage",
    "Tight",
    "Tight & No broken",
    "No loose & No Damage",
    "Tight & No play in key",
    "No loose & No loose",
    "Tight and Tight",
  ];

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    type: string;
    activity: string;
  } | null>(null);

  useEffect(() => {
    fetchAllItems();
  }, []);

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

  const fetchAllItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await checklistAPI.getAllMasters();
      if (response.success) {
        setServiceItems(response.data.service || []);
        setBarcodeItems(response.data.barcode || []);
        setWheelItems(response.data.wheel || []);
        setCheckingListItems(response.data.checkingList || []);
      } else {
        setError(response.message || "Failed to fetch items");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load checklist items");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case "service":
        return serviceItems;
      case "barcode":
        return barcodeItems;
      case "wheel":
        return wheelItems;
      case "checkingList":
        return checkingListItems;
      default:
        return [];
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "service":
        return "Service Checklist";
      case "barcode":
        return "Barcode Checklist";
      case "wheel":
        return "Wheel Checklist";
      case "checkingList":
        return "Checking List";
      default:
        return "";
    }
  };

  const handleEdit = (item: ChecklistItem) => {
    setEditingItem({ id: item.id, type: activeTab });
    setEditValue(item.activity);
    setEditStandardValue(item.standard_value || "");
    setEditImage(item.image || "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editValue.trim()) return;

    try {
      const response = await checklistAPI.updateMasterItem(
        editingItem.type,
        editingItem.id,
        editValue.trim(),
        editStandardValue,
        editImage
      );
      if (response.success) {
        await fetchAllItems();
        setEditingItem(null);
        setEditValue("");
        setEditStandardValue("");
        setEditImage("");
      } else {
        alert(response.message || "Failed to update item");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update item");
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValue("");
    setEditStandardValue("");
    setEditImage("");
  };

  const handleImageChange = (imageFile: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImage(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await checklistAPI.deleteMasterItem(
        deleteConfirm.type,
        deleteConfirm.id
      );
      if (response.success) {
        await fetchAllItems();
        setDeleteConfirm(null);
      } else {
        alert(response.message || "Failed to delete item");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  const handleAddItem = async () => {
    if (!newItemActivity.trim()) return;

    try {
      const response = await checklistAPI.addMasterItem(
        activeTab,
        newItemActivity.trim(),
        newItemStandardValue
      );
      if (response.success) {
        await fetchAllItems();
        setShowAddModal(false);
        setNewItemActivity("");
        setNewItemStandardValue("");
        alert(
          `Item added successfully! SR No: ${response.data?.sr_no || "N/A"}`
        );
      } else {
        alert(response.message || "Failed to add item");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add item");
    }
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-screen bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#0b5d3b] text-white px-4 py-3 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold">
                Checklist Items Manager
              </h1>
              <p className="text-xs text-white/80">
                Add, Edit, or Delete checklist items
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-2 md:p-4">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-3">
          <div className="flex gap-1 p-2 overflow-x-auto">
            {(["service", "barcode", "wheel", "checkingList"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "bg-[#0b5d3b] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab === "service" && "Service Checklist"}
                  {tab === "barcode" && "Barcode Checklist"}
                  {tab === "wheel" && "Wheel Checklist"}
                  {tab === "checkingList" && "Checking List"}
                </button>
              )
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              {getTabTitle()} Items
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => fetchAllItems()}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold flex items-center gap-2"
                title="Refresh data"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#0b5d3b] text-white rounded-lg hover:bg-[#0a4d30] font-semibold flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Item
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b5d3b]"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm w-20">
                      S.No
                    </th>
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">
                      Activity
                    </th>
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">
                      Standard Value
                    </th>
                    <th className="text-center py-3 px-4 text-gray-600 font-semibold text-sm">
                      Image
                    </th>
                    <th className="text-right py-3 px-4 text-gray-600 font-semibold text-sm w-40">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentItems().length > 0 ? (
                    getCurrentItems().map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4 text-gray-600 font-medium">
                          {item.sr_no}
                        </td>
                        <td className="py-4 px-4">
                          {editingItem?.id === item.id &&
                          editingItem?.type === activeTab ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-3 py-2 border-2 border-[#0b5d3b] rounded-lg focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className="text-gray-800">
                              {item.activity}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {editingItem?.id === item.id &&
                          editingItem?.type === activeTab ? (
                            <select
                              value={editStandardValue}
                              onChange={(e) =>
                                setEditStandardValue(e.target.value)
                              }
                              className="w-full px-3 py-2 border-2 border-[#0b5d3b] rounded-lg focus:outline-none bg-white text-sm"
                            >
                              <option value="">Select condition...</option>
                              {standardValueOptions.map((condition) => (
                                <option key={condition} value={condition}>
                                  {condition}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-800">
                              {item.standard_value || "-"}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {editingItem?.id === item.id &&
                          editingItem?.type === activeTab ? (
                            <div className="flex justify-center">
                              {editImage ? (
                                <div className="relative">
                                  <img
                                    src={editImage}
                                    alt="Preview"
                                    className="w-12 h-12 object-cover rounded border border-gray-300"
                                  />
                                  <button
                                    onClick={() => {
                                      const input =
                                        document.createElement("input");
                                      input.type = "file";
                                      input.accept = "image/*";
                                      input.onchange = (e) => {
                                        const file = (
                                          e.target as HTMLInputElement
                                        ).files?.[0];
                                        if (file) handleImageChange(file);
                                      };
                                      input.click();
                                    }}
                                    className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-blue-600"
                                    title="Change image"
                                  >
                                    ✎
                                  </button>
                                </div>
                              ) : (
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageChange(file);
                                  }}
                                  className="text-sm cursor-pointer"
                                />
                              )}
                            </div>
                          ) : (
                            <div>
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
                                    alt="Item"
                                    className="w-12 h-12 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  No image
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end gap-2">
                            {editingItem?.id === item.id &&
                            editingItem?.type === activeTab ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteConfirm({
                                      id: item.id,
                                      type: activeTab,
                                      activity: item.activity,
                                    })
                                  }
                                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-12 px-4 text-center text-gray-500"
                      >
                        No items found. Click "Add Item" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Add New Item
            </h3>
            <p className="text-gray-600 mb-4">
              Adding to:{" "}
              <span className="font-semibold text-[#0b5d3b]">
                {getTabTitle()}
              </span>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Activity Description
              </label>
              <textarea
                value={newItemActivity}
                onChange={(e) => setNewItemActivity(e.target.value)}
                placeholder="Enter activity description..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0b5d3b] focus:outline-none transition-colors resize-none"
                rows={3}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Standard Value
              </label>
              <select
                value={newItemStandardValue}
                onChange={(e) => setNewItemStandardValue(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0b5d3b] focus:outline-none transition-colors bg-white"
              >
                <option value="">Select condition...</option>
                {standardValueOptions.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewItemActivity("");
                  setNewItemStandardValue("");
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItemActivity.trim()}
                className="flex-1 px-4 py-3 bg-[#0b5d3b] text-white rounded-xl font-semibold hover:bg-[#0a4d30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Item
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-red-600 mb-4">
              Delete Item?
            </h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this item?
            </p>
            <p className="text-gray-800 font-medium bg-gray-100 p-3 rounded-lg mb-6">
              "{deleteConfirm.activity}"
            </p>
            <p className="text-sm text-red-500 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image Preview Card on Hover */}
      {hoveredImage && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
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
  );
}
