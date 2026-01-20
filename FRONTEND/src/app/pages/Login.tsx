import { useState } from "react";
import { motion } from "motion/react";
import { authAPI } from "../../api";

interface LoginProps {
  onLogin: (userRole: "admin" | "user") => void;
}

export function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!userId || !password) {
      setError("Please enter both User ID and Password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(userId, password);
      if (response.success) {
        onLogin(response.data.role as "admin" | "user");
      } else {
        setError(response.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b5d3b] to-[#0a4d30] flex flex-col items-center justify-center p-4">
      {/* Header Section */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center text-white mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-2">
          EMS Hanger System
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-2">
          Skoda Volkswagen Assembly
        </p>
        <p className="text-sm md:text-base text-white/80">
          Professional industrial activity tracking system
        </p>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Login</h2>
          <p className="text-gray-600 text-sm">
            Enter your credentials to continue
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your user ID"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:border-[#0b5d3b] focus:outline-none focus:ring-1 focus:ring-[#0b5d3b] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:border-[#0b5d3b] focus:outline-none focus:ring-1 focus:ring-[#0b5d3b] transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-[#0b5d3b] text-white py-3 rounded-lg text-base font-semibold hover:bg-[#0a4d30] transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transform"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Secure access to manufacturing systems
        </p>
      </motion.div>
    </div>
  );
}
