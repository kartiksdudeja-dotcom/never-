import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Navbar } from "../components/Navbar";
import { Dialog } from "../components/ui/dialog";
import {
  usersAPI,
  dashboardAPI,
  authAPI,
  checklistAPI,
  barcodeChecklistAPI,
  wheelChecklistAPI,
  checkingListChecklistAPI,
} from "../../api";

interface AdminDashboardProps {
  onLogout: () => void;
  onBack: () => void;
  onOpenReport?: () => void;
}

interface User {
  id: number;
  user_id: string;
  role: string;
  status: string;
}

interface DashboardStats {
  totalUsers: number;
  activeSessions: number;
  todayLogs: number;
  adminCount?: number;
  userCount?: number;
}

export function AdminDashboard({
  onLogout,
  onBack,
  onOpenReport,
}: AdminDashboardProps) {
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [users, setUsers] = useState<User[]>([]);
  const [checklistReports, setChecklistReports] = useState<any[]>([]);
  const [barcodeReports, setBarcodeReports] = useState<any[]>([]);
  const [wheelReports, setWheelReports] = useState<any[]>([]);
  const [checkingListReports, setCheckingListReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    "users" | "checklist" | "barcode" | "wheel" | "checkingList"
  >("users");
  const [selectedReportDetails, setSelectedReportDetails] = useState<any>(null);
  const [reportDetailsLoading, setReportDetailsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSessions: 0,
    todayLogs: 0,
    adminCount: 0,
    userCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch users and dashboard stats on mount
  useEffect(() => {
    fetchData();

    // Verify role every 10 seconds (to detect if user was promoted/demoted)
    const roleCheckInterval = setInterval(async () => {
      try {
        const currentRole = await authAPI.getCurrentRole();
        // If role changed to non-admin, the App component will need to handle logout
        // This is checked when navigating pages
      } catch (err) {
        console.error("Role check failed:", err);
      }
    }, 10000);

    return () => clearInterval(roleCheckInterval);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      console.log("Fetching users data...");
      const [
        usersResponse,
        dashboardResponse,
        checklistResponse,
        barcodeResponse,
        wheelResponse,
        checkingListResponse,
      ] = await Promise.all([
        usersAPI.getAll(),
        dashboardAPI.getAdmin(),
        checklistAPI.getReport(),
        barcodeChecklistAPI
          .getReport()
          .catch(() => ({ success: true, data: [] })),
        wheelChecklistAPI
          .getReport()
          .catch(() => ({ success: true, data: [] })),
        checkingListChecklistAPI
          .getReport()
          .catch(() => ({ success: true, data: [] })),
      ]);

      console.log("Users Response:", usersResponse);
      console.log("Dashboard Response:", dashboardResponse);
      console.log("Checklist Response:", checklistResponse);
      console.log("Barcode Response:", barcodeResponse);
      console.log("Wheel Response:", wheelResponse);
      console.log("Checking List Response:", checkingListResponse);

      if (usersResponse.success) {
        console.log("Setting users:", usersResponse.data);
        setUsers(usersResponse.data);
        // Count admins and users
        const adminCount = usersResponse.data.filter(
          (u: User) => u.role === "admin"
        ).length;
        const userCount = usersResponse.data.filter(
          (u: User) => u.role === "user"
        ).length;
        console.log(`Admin count: ${adminCount}, User count: ${userCount}`);
        setStats((prev) => ({
          ...prev,
          adminCount,
          userCount,
          totalUsers: usersResponse.data.length,
        }));
      } else {
        setError(usersResponse.message || "Failed to fetch users");
      }

      if (checklistResponse.success) {
        console.log("Setting checklist reports:", checklistResponse.data);
        setChecklistReports(checklistResponse.data);
      }

      if (barcodeResponse.success) {
        console.log("Setting barcode reports:", barcodeResponse.data);
        setBarcodeReports(barcodeResponse.data);
      }

      if (wheelResponse.success) {
        console.log("Setting wheel reports:", wheelResponse.data);
        setWheelReports(wheelResponse.data);
      }

      if (checkingListResponse.success) {
        console.log(
          "Setting checking list reports:",
          checkingListResponse.data
        );
        setCheckingListReports(checkingListResponse.data);
      }

      if (dashboardResponse.success) {
        setStats((prev) => ({
          ...prev,
          activeSessions: dashboardResponse.data.activeSessions,
          todayLogs: dashboardResponse.data.todayLogs,
        }));
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (newUserId && newPassword) {
      try {
        const response = await usersAPI.create(newUserId, newPassword, newRole);
        if (response.success) {
          setUsers([
            ...users,
            {
              id: response.data.id,
              user_id: response.data.userId,
              role: response.data.role,
              status: "active",
            },
          ]);
          setNewUserId("");
          setNewPassword("");
          setNewRole("user");
          setShowUserDialog(false);
          await fetchData();
        }
      } catch (err: any) {
        alert(err.message || "Failed to create user");
      }
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const response = await usersAPI.update(userId, { role: newRole });
      if (response.success) {
        await fetchData();
      }
    } catch (err: any) {
      alert(
        err.message ||
          `Failed to ${newRole === "admin" ? "promote" : "demote"} user`
      );
    }
  };

  const handleViewChecklistDetails = async (report: any) => {
    setReportDetailsLoading(true);
    try {
      const response = await checklistAPI.getReportDetails(
        report.hanger_no.toString(),
        report.submission_date,
        report.submitted_by
      );

      if (response.success) {
        setSelectedReportDetails(response.data);
        console.log("Checklist details:", response.data);
      } else {
        alert(response.message || "Failed to fetch checklist details");
      }
    } catch (err: any) {
      console.error("Error fetching checklist details:", err);
      alert(err.message || "Failed to fetch checklist details");
    } finally {
      setReportDetailsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-screen bg-gray-50"
    >
      <Navbar
        onUsersClick={() => setShowUserDialog(true)}
        onLogout={onLogout}
      />

      <div className="pt-16 px-4 pb-6 md:pt-24 md:px-6 max-w-7xl md:mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 md:mt-0"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-1 md:mb-2">
            Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600 mb-2 md:mb-4">
            EMS Hanger Activity Log System
            <span className="hidden md:inline"> - Admin Portal</span>
          </p>
          <button
            onClick={onBack}
            className="text-[#0b5d3b] hover:underline font-medium text-sm md:text-base mb-6 md:mb-8"
          >
            ← Back to Welcome
          </button>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p>
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <p>Loading user data...</p>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">👨‍💼</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.adminCount || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0b5d3b] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">👥</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Users</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.userCount || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.activeSessions}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">🏭</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Logs</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.todayLogs}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6"
        >
          {/* Tab Navigation */}
          <div className="flex gap-2 md:gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 md:px-4 py-3 font-semibold text-xs md:text-base transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "users"
                  ? "text-[#0b5d3b] border-[#0b5d3b]"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab("checklist")}
              className={`px-3 md:px-4 py-3 font-semibold text-xs md:text-base transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "checklist"
                  ? "text-[#0b5d3b] border-[#0b5d3b]"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              Service Checklist
            </button>
            <button
              onClick={() => setActiveTab("barcode")}
              className={`px-3 md:px-4 py-3 font-semibold text-xs md:text-base transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "barcode"
                  ? "text-[#0b5d3b] border-[#0b5d3b]"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              Barcode Checklist
            </button>
            <button
              onClick={() => setActiveTab("wheel")}
              className={`px-3 md:px-4 py-3 font-semibold text-xs md:text-base transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "wheel"
                  ? "text-[#0b5d3b] border-[#0b5d3b]"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              Wheel Checklist
            </button>
            <button
              onClick={() => setActiveTab("checkingList")}
              className={`px-3 md:px-4 py-3 font-semibold text-xs md:text-base transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "checkingList"
                  ? "text-[#0b5d3b] border-[#0b5d3b]"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              Checking List
            </button>
          </div>

          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
                User Management
              </h2>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        User ID
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Role
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Status
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users && users.length > 0 ? (
                      users.map((user, index) => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-2 md:px-4 text-gray-600 text-sm">
                            {index + 1}
                          </td>
                          <td className="py-3 px-2 md:px-4 font-medium text-gray-800 text-sm">
                            {user.user_id}
                          </td>
                          <td className="py-3 px-2 md:px-4">
                            <span
                              className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                                user.role === "admin"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {user.role === "admin" ? "Admin" : "User"}
                            </span>
                          </td>
                          <td className="py-3 px-2 md:px-4">
                            <span
                              className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                                user.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {user.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3 px-2 md:px-4">
                            <button
                              onClick={() =>
                                handleRoleChange(
                                  user.id,
                                  user.role === "admin" ? "user" : "admin"
                                )
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                user.role === "admin"
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                            >
                              {user.role === "admin" ? "Demote" : "Promote"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 px-4 text-center text-gray-500"
                        >
                          No users found. Create a new user to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Checklist Reports Tab */}
          {activeTab === "checklist" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                  Checklist Submission Reports
                </h2>
                {onOpenReport && (
                  <button
                    onClick={onOpenReport}
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Manage Items
                  </button>
                )}
              </div>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Hanger #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Submitted By
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Date
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Total Items
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Completed
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Failed
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Pending
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistReports && checklistReports.length > 0 ? (
                      checklistReports.map((report, index) => {
                        const completionPercentage =
                          report.total_items > 0
                            ? Math.round(
                                (report.completed_items / report.total_items) *
                                  100
                              )
                            : 0;

                        let statusColor =
                          "bg-white border-2 border-gray-300 text-gray-700";
                        let statusLabel = "Service Pending";
                        if (completionPercentage === 100) {
                          statusColor = "bg-green-100 text-green-700";
                          statusLabel = "Completed";
                        } else if (report.failed_items > 0) {
                          statusColor = "bg-red-100 text-red-700";
                          statusLabel = "Hangers With Abnormality";
                        }

                        return (
                          <tr
                            key={`${report.hanger_no}-${report.submission_date}-${report.submitted_by}-${index}`}
                            onClick={() => handleViewChecklistDetails(report)}
                            className="border-b border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-2 md:px-4 text-gray-600 text-sm">
                              {index + 1}
                            </td>
                            <td className="py-3 px-2 md:px-4 font-medium text-gray-800 text-sm">
                              {report.hanger_no}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                              {report.submitted_by}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                              {new Date(
                                report.submission_date
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm font-semibold">
                              {report.total_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-green-700 text-sm font-semibold">
                              {report.completed_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-red-700 text-sm font-semibold">
                              {report.failed_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-yellow-700 text-sm font-semibold">
                              {report.pending_items}
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <span
                                className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${statusColor}`}
                              >
                                {completionPercentage}% Done
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 px-4 text-center text-gray-500"
                        >
                          No checklist submissions found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Barcode Checklist Tab */}
          {activeTab === "barcode" && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
                Barcode Checklist Reports
              </h2>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Hanger #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Submitted By
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Date
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Total
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Completed
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Failed
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Pending
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {barcodeReports && barcodeReports.length > 0 ? (
                      barcodeReports.map((report, index) => {
                        const completionPercentage =
                          report.total_items > 0
                            ? Math.round(
                                (report.completed_items / report.total_items) *
                                  100
                              )
                            : 0;
                        let statusColor =
                          "bg-white border-2 border-gray-300 text-gray-700";
                        let statusLabel = "Service Pending";
                        if (completionPercentage === 100) {
                          statusColor = "bg-green-100 text-green-700";
                          statusLabel = "Completed";
                        } else if (report.failed_items > 0) {
                          statusColor = "bg-red-100 text-red-700";
                          statusLabel = "Hangers With Abnormality";
                        }
                        return (
                          <tr
                            key={`barcode-${report.hanger_no}-${report.submission_date}-${index}`}
                            className="border-b border-gray-100 hover:bg-gray-100"
                          >
                            <td className="py-3 px-2 md:px-4 text-gray-600 text-sm">
                              {index + 1}
                            </td>
                            <td className="py-3 px-2 md:px-4 font-medium text-gray-800 text-sm">
                              {report.hanger_no}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                              {report.submitted_by || "N/A"}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                              {report.submission_date
                                ? new Date(
                                    report.submission_date
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm font-semibold">
                              {report.total_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-green-700 text-sm font-semibold">
                              {report.completed_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-red-700 text-sm font-semibold">
                              {report.failed_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-yellow-700 text-sm font-semibold">
                              {report.pending_items}
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <span
                                className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${statusColor}`}
                              >
                                {completionPercentage}% Done
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 px-4 text-center text-gray-500"
                        >
                          No barcode checklist submissions found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Wheel Checklist Tab */}
          {activeTab === "wheel" && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
                Wheel Checklist Reports
              </h2>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Hanger #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Submitted By
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Date
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Total
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Completed
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Failed
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Pending
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {wheelReports && wheelReports.length > 0 ? (
                      wheelReports.map((report, index) => {
                        const completionPercentage =
                          report.total_items > 0
                            ? Math.round(
                                (report.completed_items / report.total_items) *
                                  100
                              )
                            : 0;
                        let statusColor =
                          "bg-white border-2 border-gray-300 text-gray-700";
                        let statusLabel = "Service Pending";
                        if (completionPercentage === 100) {
                          statusColor = "bg-green-100 text-green-700";
                          statusLabel = "Completed";
                        } else if (report.failed_items > 0) {
                          statusColor = "bg-red-100 text-red-700";
                          statusLabel = "Hangers With Abnormality";
                        }
                        return (
                          <tr
                            key={`wheel-${report.hanger_no}-${report.submission_date}-${index}`}
                            className="border-b border-gray-100 hover:bg-gray-100"
                          >
                            <td className="py-3 px-2 md:px-4 text-gray-600 text-sm">
                              {index + 1}
                            </td>
                            <td className="py-3 px-2 md:px-4 font-medium text-gray-800 text-sm">
                              {report.hanger_no}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                              {report.submitted_by || "N/A"}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                              {report.submission_date
                                ? new Date(
                                    report.submission_date
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm font-semibold">
                              {report.total_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-green-700 text-sm font-semibold">
                              {report.completed_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-red-700 text-sm font-semibold">
                              {report.failed_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-yellow-700 text-sm font-semibold">
                              {report.pending_items}
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <span
                                className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${statusColor}`}
                              >
                                {completionPercentage}% Done
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 px-4 text-center text-gray-500"
                        >
                          No wheel checklist submissions found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Checking List Tab */}
          {activeTab === "checkingList" && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
                Checking List Reports
              </h2>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Hanger #
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Submitted By
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Date
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Total
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Completed
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Failed
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Pending
                      </th>
                      <th className="text-left py-3 px-2 md:px-4 text-gray-600 font-semibold text-sm">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkingListReports && checkingListReports.length > 0 ? (
                      checkingListReports.map((report, index) => {
                        const completionPercentage =
                          report.total_items > 0
                            ? Math.round(
                                (report.completed_items / report.total_items) *
                                  100
                              )
                            : 0;
                        let statusColor =
                          "bg-white border-2 border-gray-300 text-gray-700";
                        let statusLabel = "Service Pending";
                        if (completionPercentage === 100) {
                          statusColor = "bg-green-100 text-green-700";
                          statusLabel = "Completed";
                        } else if (report.failed_items > 0) {
                          statusColor = "bg-red-100 text-red-700";
                          statusLabel = "Hangers With Abnormality";
                        }
                        return (
                          <tr
                            key={`checking-${report.hanger_no}-${report.submission_date}-${index}`}
                            className="border-b border-gray-100 hover:bg-gray-100"
                          >
                            <td className="py-3 px-2 md:px-4 text-gray-600 text-sm">
                              {index + 1}
                            </td>
                            <td className="py-3 px-2 md:px-4 font-medium text-gray-800 text-sm">
                              {report.hanger_no}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                              {report.submitted_by || "N/A"}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                              {report.submission_date
                                ? new Date(
                                    report.submission_date
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-700 text-sm font-semibold">
                              {report.total_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-green-700 text-sm font-semibold">
                              {report.completed_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-red-700 text-sm font-semibold">
                              {report.failed_items}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-yellow-700 text-sm font-semibold">
                              {report.pending_items}
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <span
                                className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${statusColor}`}
                              >
                                {completionPercentage}% Done
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 px-4 text-center text-gray-500"
                        >
                          No checking list submissions found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* User Dialog - Mobile Optimized */}
      {showUserDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Add New User
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-[#0b5d3b] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-[#0b5d3b] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-[#0b5d3b] focus:outline-none transition-colors"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleAddUser}
                className="w-full px-4 py-3 bg-[#0b5d3b] text-white rounded-xl text-base font-semibold hover:bg-[#0a4d30] transition-colors active:scale-95"
              >
                Add User
              </button>
              <button
                onClick={() => setShowUserDialog(false)}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-base font-semibold hover:bg-gray-200 transition-colors active:scale-95"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Checklist Details Modal */}
      {selectedReportDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 max-w-3xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header with Back Button */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                  Checklist Details
                </h2>
                <p className="text-sm md:text-base text-gray-600 mt-2">
                  Hanger{" "}
                  <span className="font-semibold">
                    #{selectedReportDetails.hanger_no}
                  </span>{" "}
                  • Submitted by{" "}
                  <span className="font-semibold">
                    {selectedReportDetails.submitted_by}
                  </span>
                </p>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  {new Date(
                    selectedReportDetails.submission_date
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedReportDetails(null)}
                className="text-gray-400 hover:text-gray-600 text-3xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Items Table */}
            {reportDetailsLoading ? (
              <div className="py-12 text-center text-gray-500">
                <p className="text-base">Loading checklist details...</p>
              </div>
            ) : selectedReportDetails.items &&
              selectedReportDetails.items.length > 0 ? (
              <div className="overflow-auto flex-1 -mx-4 px-4 md:mx-0 md:px-0 max-h-[60vh]">
                <table className="w-full min-w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#0b5d3b] text-white">
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">
                        #
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">
                        Activity
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                        Status
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReportDetails.items.map(
                      (item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3 text-gray-800 text-sm font-semibold">
                            {item.sr_no}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 font-medium text-gray-800 text-sm">
                            {item.activity}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                item.status === "done"
                                  ? "bg-green-100 text-green-800"
                                  : item.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {item.status === "done"
                                ? "✓ Done"
                                : item.status === "failed"
                                ? "✗ Failed"
                                : "⏳ Pending"}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-gray-700 text-sm">
                            {item.remarks ? (
                              <span
                                title={item.remarks}
                                className="break-words"
                              >
                                {item.remarks}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <p className="text-base">No items found for this checklist.</p>
              </div>
            )}

            {/* Close Button */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedReportDetails(null)}
                className="flex-1 px-4 py-3 bg-[#0b5d3b] text-white rounded-xl text-base font-semibold hover:bg-[#0a4d30] transition-colors active:scale-95"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
