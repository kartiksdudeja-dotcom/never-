/// <reference types="vite/client" />

// API Configuration and Service
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://10.42.0.1:5000/api";

// Remove console logs in production
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => isDev && console.log(...args);

// Token management - Use sessionStorage for better security (clears on browser close)
export const getToken = (): string | null => {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
};

export const setToken = (token: string, rememberMe: boolean = false): void => {
  if (rememberMe) {
    localStorage.setItem("token", token);
  } else {
    sessionStorage.setItem("token", token);
  }
};

export const removeToken = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("userRole");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("userRole");
};

export const setUserInfo = (userId: string, role: string): void => {
  // Don't store sensitive info - only basic user info
  sessionStorage.setItem("userId", userId);
  sessionStorage.setItem("userRole", role);
};

export const getUserInfo = (): {
  userId: string | null;
  role: string | null;
} => {
  return {
    userId: sessionStorage.getItem("userId") || localStorage.getItem("userId"),
    role:
      sessionStorage.getItem("userRole") || localStorage.getItem("userRole"),
  };
};

// Input sanitization
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>\"']/g, "").trim();
};

// Simple cache for API responses
const apiCache = new Map<
  string,
  { data: any; timestamp: number; ttl: number }
>();

// Cache TTL in milliseconds (default 5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

const getCachedResponse = (
  key: string
): any | null => {
  const cached = apiCache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > cached.ttl) {
    apiCache.delete(key);
    return null;
  }

  log(`[CACHE HIT] ${key}`);
  return cached.data;
};

const setCachedResponse = (
  key: string,
  data: any,
  ttl: number = DEFAULT_CACHE_TTL
) => {
  apiCache.set(key, { data, timestamp: Date.now(), ttl });
};
// Prevent duplicate parallel requests
const activeRequests = new Map<string, Promise<any>>();

// Retry only for network failure (NOT for 429)
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 2
): Promise<Response> => {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, 400 * (3 - retries)));
    return fetchWithRetry(url, options, retries - 1);
  }
};


// Base fetch function with auth and caching
const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {},
  cacheKey?: string,
  cacheTTL?: number
) => {

  // Cache check (GET only)
  if (!options.method || options.method === "GET") {
    const key = cacheKey || endpoint;
    const cached = getCachedResponse(key);
    if (cached) return cached;
  }

  // Prevent duplicate parallel calls
  const requestKey = `${endpoint}-${options.method || "GET"}`;
  if (activeRequests.has(requestKey)) {
    return activeRequests.get(requestKey);
  }

  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const method = options.method || "GET";
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  const requestPromise = (async () => {
    try {
      console.log(`[API] Sending ${method} to ${fullUrl}`);

      const response = await fetchWithRetry(fullUrl, {
        ...options,
        method,
        headers,
        credentials: "omit",
      });

      console.log(`[API] Response ${response.status} from ${endpoint}`);

      const text = await response.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, message: text || "Invalid response format" };
      }

      if (!response.ok) {

        if (response.status === 401 && !endpoint.includes("login")) {
          removeToken();
          window.location.href = "/";
        }

        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a few seconds.");
        }

        throw new Error(data.message || "Request failed");
      }

      // Clear cache on successful mutation (POST, PUT, DELETE)
      if (method !== "GET") {
        clearCache();
      }

      // Save cache if GET
      if (!options.method || options.method === "GET") {
        const key = cacheKey || endpoint;
        setCachedResponse(key, data, cacheTTL);
      }

      return data;

    } catch (err: any) {
      throw new Error(`${endpoint}: ${err.message}`);
    } finally {
      activeRequests.delete(requestKey);
    }
  })();

  activeRequests.set(requestKey, requestPromise);

  return requestPromise;
};


 


// Clear cache for specific endpoint
export const clearCache = (endpoint?: string) => {
  if (endpoint) {
    apiCache.delete(endpoint);
  } else {
    apiCache.clear();
  }
};

// Auth API
export const authAPI = {
  login: async (userId: string, password: string) => {
    // Clear cache on login for fresh data
    clearCache();
    
    // Sanitize inputs
    const sanitizedUserId = sanitizeInput(userId);

    const response = await fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify({ userId: sanitizedUserId, password }),
    });

    if (response.success) {
      setToken(response.data.token);
      setUserInfo(response.data.userId, response.data.role);
    }

    return response;
  },

  logout: async () => {
    try {
      await fetchWithAuth("/auth/logout", { method: "POST" });
    } finally {
      removeToken();
    }
  },

  verify: async () => {
  return fetchWithAuth(
    "/auth/verify",
    {},
    "auth/verify",
    10000   // cache 10 seconds
  );
},

  // Get current user's role from backend
  getCurrentRole: async () => {
    try {
      const response = await fetchWithAuth(
  "/auth/verify",
  {},
  "auth/verify",
  10000
);

      if (response.success) {
        const backendRole = response.data.role;
        const storedRole = localStorage.getItem("userRole");

        // Update localStorage if role changed
        if (backendRole && backendRole !== storedRole) {
          setUserInfo(response.data.userId, backendRole);
        }

        return backendRole;
      }
    } catch (err) {
      console.error("Failed to get current role:", err);
    }
    return null;
  },
};

// Users API (Admin only)
export const usersAPI = {
  getAll: async () => {
    return fetchWithAuth("/users");
  },

  create: async (userId: string, password: string, role: string = "user") => {
    return fetchWithAuth("/users", {
      method: "POST",
      body: JSON.stringify({ userId, password, role }),
    });
  },

  update: async (
    id: number,
    data: { password?: string; status?: string; role?: string }
  ) => {
    return fetchWithAuth(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return fetchWithAuth(`/users/${id}`, {
      method: "DELETE",
    });
  },
};

// Hangers API
export const hangersAPI = {
  getAll: async () => {
    return fetchWithAuth("/hangers");
  },

  getStats: async () => {
    return fetchWithAuth("/hangers/stats");
  },

  getOne: async (hangerNo: number) => {
    return fetchWithAuth(`/hangers/${hangerNo}`);
  },

  update: async (
    hangerNo: number,
    data: { status?: string; lastServicedBy?: string }
  ) => {
    return fetchWithAuth(`/hangers/${hangerNo}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  bulkUpdate: async (updates: Array<{ hangerNo: number; status: string }>) => {
    return fetchWithAuth("/hangers/bulk-update", {
      method: "PUT",
      body: JSON.stringify({ updates }),
    });
  },
};

// Checklist API
export const checklistAPI = {
  getMaster: async () => {
    return fetchWithAuth("/checklist/master");
  },

  getForHanger: async (hangerNo: number) => {
    return fetchWithAuth(`/checklist/hanger/${hangerNo}`);
  },

  save: async (
    hangerNo: number,
    checklist: Array<{
      sr_no: number;
      activity: string;
      status: string;
      remarks: string;
    }>,
    doneBy: string,
    doneOn: string
  ) => {
    // Validate date format YYYY-MM-DD
    if (!doneOn || !/^\d{4}-\d{2}-\d{2}$/.test(doneOn)) {
      throw new Error(
        `Invalid date format. Expected YYYY-MM-DD, got: ${doneOn}`
      );
    }

    // Validate that the date is valid (e.g., not Jan 32)
    const dateObj = new Date(doneOn + "T00:00:00Z");
    const [year, month, day] = doneOn.split("-").map(Number);
    if (
      dateObj.getUTCFullYear() !== year ||
      dateObj.getUTCMonth() + 1 !== month ||
      dateObj.getUTCDate() !== day
    ) {
      throw new Error(
        `Invalid date: ${doneOn} is not a valid calendar date`
      );
    }

    return fetchWithAuth(`/checklist/hanger/${hangerNo}`, {
      method: "POST",
      body: JSON.stringify({ checklist, doneBy, doneOn }),
    });
  },

  getHistory: async (hangerNo: number) => {
    return fetchWithAuth(`/checklist/history/${hangerNo}`);
  },

  getReport: async () => {
    return fetchWithAuth("/checklist/report");
  },

  getReportDetails: async (hangerNo: string, date: string, user: string) => {
    const params = new URLSearchParams({ hanger_no: hangerNo, date, user });
    return fetchWithAuth(`/checklist/report/details?${params.toString()}`);
  },

  // Master checklist management
  getAllMasters: async () => {
    return fetchWithAuth("/checklist/master/all");
  },

  addMasterItem: async (
    checklistType: string,
    activity: string,
    standardValue: string = ""
  ) => {
    return fetchWithAuth(`/checklist/master/${checklistType}`, {
      method: "POST",
      body: JSON.stringify({ activity, standard_value: standardValue }),
    });
  },

  updateMasterItem: async (
    checklistType: string,
    itemId: number,
    activity: string,
    standardValue: string = "",
    image: string = ""
  ) => {
    return fetchWithAuth(`/checklist/master/${checklistType}/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ activity, standard_value: standardValue, image }),
    });
  },

  deleteMasterItem: async (checklistType: string, itemId: number) => {
    return fetchWithAuth(`/checklist/master/${checklistType}/${itemId}`, {
      method: "DELETE",
    });
  },

  // Admin endpoints for managing submissions
  editSubmission: async (
    submissionId: number,
    data: {
      status?: string;
      remarks?: string;
      done_by?: string;
      done_on?: string;
    }
  ) => {
    return fetchWithAuth(`/checklist/submission/${submissionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteSubmission: async (submissionId: number) => {
    return fetchWithAuth(`/checklist/submission/${submissionId}`, {
      method: "DELETE",
    });
  },

  deleteSubmissionByDetails: async (
    checklistType: string,
    hangerNo: number,
    date: string,
    user: string
  ) => {
    const params = new URLSearchParams({
      hanger_no: hangerNo.toString(),
      date,
      user,
    });
    return fetchWithAuth(
      `/checklist/submission/${checklistType}?${params.toString()}`,
      {
        method: "DELETE",
      }
    );
  },
};

// Barcode Checklist API
export const barcodeChecklistAPI = {
  getMaster: async () => {
    return fetchWithAuth("/checklist/barcode/master");
  },

  getForHanger: async (hangerNo: number) => {
    return fetchWithAuth(`/checklist/barcode/hanger/${hangerNo}`);
  },

  save: async (
    hangerNo: number,
    checklist: Array<{
      sr_no: number;
      activity: string;
      status: string;
      remarks: string;
    }>,
    doneBy: string,
    doneOn: string
  ) => {
    return fetchWithAuth(`/checklist/barcode/hanger/${hangerNo}`, {
      method: "POST",
      body: JSON.stringify({ checklist, doneBy, doneOn }),
    });
  },

  getReport: async () => {
    return fetchWithAuth("/checklist/barcode/report");
  },

  getReportDetails: async (hangerNo: string, submissionDate: string) => {
    const params = new URLSearchParams({
      hanger_no: hangerNo,
      submission_date: submissionDate,
    });
    return fetchWithAuth(
      `/checklist/barcode/report/details?${params.toString()}`
    );
  },
};

// Wheel Checklist API
export const wheelChecklistAPI = {
  getMaster: async () => {
    return fetchWithAuth("/checklist/wheel/master");
  },

  getForHanger: async (hangerNo: number) => {
    return fetchWithAuth(`/checklist/wheel/hanger/${hangerNo}`);
  },

  save: async (
    hangerNo: number,
    checklist: Array<{
      sr_no: number;
      activity: string;
      status: string;
      remarks: string;
    }>,
    doneBy: string,
    doneOn: string
  ) => {
    return fetchWithAuth(`/checklist/wheel/hanger/${hangerNo}`, {
      method: "POST",
      body: JSON.stringify({ checklist, doneBy, doneOn }),
    });
  },

  getReport: async () => {
    return fetchWithAuth("/checklist/wheel/report");
  },

  getReportDetails: async (hangerNo: string, submissionDate: string) => {
    const params = new URLSearchParams({
      hanger_no: hangerNo,
      submission_date: submissionDate,
    });
    return fetchWithAuth(
      `/checklist/wheel/report/details?${params.toString()}`
    );
  },
};

// Checking List Checklist API
export const checkingListChecklistAPI = {
  getMaster: async () => {
    return fetchWithAuth("/checklist/checking-list/master");
  },

  getForHanger: async (hangerNo: number) => {
    return fetchWithAuth(`/checklist/checking-list/hanger/${hangerNo}`);
  },

  save: async (
    hangerNo: number,
    checklist: Array<{
      sr_no: number;
      activity: string;
      status: string;
      remarks: string;
    }>,
    doneBy: string,
    doneOn: string
  ) => {
    return fetchWithAuth(`/checklist/checking-list/hanger/${hangerNo}`, {
      method: "POST",
      body: JSON.stringify({ checklist, doneBy, doneOn }),
    });
  },

  getReport: async () => {
    return fetchWithAuth("/checklist/checking-list/report");
  },

  getReportDetails: async (hangerNo: string, submissionDate: string) => {
    const params = new URLSearchParams({
      hanger_no: hangerNo,
      submission_date: submissionDate,
    });
    return fetchWithAuth(
      `/checklist/checking-list/report/details?${params.toString()}`
    );
  },
};

// Activity API
export const activityAPI = {
  log: async (
    activityType: "service" | "barcode" | "wheel",
    hangerNo?: number,
    description?: string
  ) => {
    return fetchWithAuth("/activity/log", {
      method: "POST",
      body: JSON.stringify({ activityType, hangerNo, description }),
    });
  },

  getToday: async () => {
    return fetchWithAuth("/activity/today");
  },

  getTodayStats: async () => {
    return fetchWithAuth("/activity/today/stats");
  },

  getHistory: async (filters?: {
    type?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.from) params.append("from", filters.from);
    if (filters?.to) params.append("to", filters.to);
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const queryString = params.toString();
    return fetchWithAuth(
      `/activity/history${queryString ? `?${queryString}` : ""}`
    );
  },
};

// Dashboard API
export const dashboardAPI = {
  getAdmin: async () => {
    // Cache admin dashboard for 3 minutes
    return fetchWithAuth(
      "/dashboard/admin",
      {},
      "dashboard/admin",
      3 * 60 * 1000
    );
  },

  getUser: async () => {
    // Cache user dashboard for 2 minutes
    return fetchWithAuth(
      "/dashboard/user",
      {},
      "dashboard/user",
      2 * 60 * 1000
    );
  },
};

export default {
  auth: authAPI,
  users: usersAPI,
  hangers: hangersAPI,
  checklist: checklistAPI,
  barcodeChecklist: barcodeChecklistAPI,
  wheelChecklist: wheelChecklistAPI,
  checkingListChecklist: checkingListChecklistAPI,
  activity: activityAPI,
  dashboard: dashboardAPI,
};
