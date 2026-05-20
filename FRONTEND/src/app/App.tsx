import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { Login } from "./pages/Login";
import { Welcome } from "./pages/Welcome";
import { AdminDashboard } from "./pages/AdminDashboard";
import { UserDashboard } from "./pages/UserDashboard";
import { HangerServicing } from "./pages/HangerServicing";
import { TodayActivity } from "./pages/TodayActivity";
import { ServiceChecklist } from "./pages/ServiceChecklist";
import { BarcodeChecklist } from "./pages/BarcodeChecklist";
import { WheelChecklist } from "./pages/WheelChecklist";
import { CheckingListChecklist } from "./pages/CheckingListChecklist";
import { BarcodeCompletion } from "./pages/BarcodeCompletion";
import { WheelCompletion } from "./pages/WheelCompletion";
import { CheckingListCompletion } from "./pages/CheckingListCompletion";
import ChecklistReport from "./pages/ChecklistReport";
import { ChecklistItemsManager } from "./pages/ChecklistItemsManager";
import HotspotQRCode from "./pages/HotspotQRCode";
import CaptivePortal from "./pages/CaptivePortal";
import { authAPI, removeToken, getUserInfo, getToken } from "../api";

type Page =
  | "login"
  | "welcome"
  | "admin"
  | "userDashboard"
  | "hangerServicing"
  | "todayActivity"
  | "serviceChecklist"
  | "barcodeChecklist"
  | "wheelChecklist"
  | "checkingListChecklist"
  | "barcodeCompletion"
  | "wheelCompletion"
  | "checkingListCompletion"
  | "checklistReport"
  | "checklistItemsManager"
  | "hotspotQRCode"
  | "captivePortal";
type UserRole = "admin" | "user" | null;

export default function App() {
  // URL-based routing for captive portal
  const getInitialPage = (): Page => {
    const path = window.location.pathname.toLowerCase();
    // Handle captive portal routes
    if (path === '/captive-portal' || path === '/captive' || path === '/portal') {
      return 'captivePortal';
    }
    // Handle hotspot QR code page
    if (path === '/hotspot' || path === '/hotspot-qr' || path === '/qr') {
      return 'hotspotQRCode';
    }
    // Handle common captive portal detection paths (redirect to captive portal)
    if (path === '/generate_204' || path === '/hotspot-detect.html' || 
        path === '/connecttest.txt' || path === '/ncsi.txt' ||
        path === '/success.txt' || path === '/redirect') {
      return 'captivePortal';
    }
    return 'login';
  };

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedBarcodeHanger, setSelectedBarcodeHanger] = useState<
    number | undefined
  >();
  const [selectedWheelHanger, setSelectedWheelHanger] = useState<
    number | undefined
  >();
  const [selectedCheckingListHanger, setSelectedCheckingListHanger] = useState<
    number | undefined
  >();
  const [selectedHangerNo, setSelectedHangerNo] = useState<number | null>(null);
  const [servicingSubmissionTrigger, setServicingSubmissionTrigger] =
    useState<number>(0);
  const [barcodeSubmissionTrigger, setBarcodeSubmissionTrigger] = useState<number>(0);
  const [wheelSubmissionTrigger, setWheelSubmissionTrigger] = useState<number>(0);
  const [checkingListSubmissionTrigger, setCheckingListSubmissionTrigger] =
    useState<number>(0);

  // Verify token on app load - only allow access if token is valid
  // Skip verification for captive portal and hotspot pages (public access)
  useEffect(() => {
    const verifyToken = async () => {
        if (!isInitialLoad) return;
      // Skip auth for public pages (captive portal, hotspot)
      const publicPages: Page[] = ['captivePortal', 'hotspotQRCode'];
      if (publicPages.includes(currentPage)) {
        setIsVerifying(false);
        setIsInitialLoad(false);
        return;
      }

      try {
        const token = getToken();
        const userInfo = getUserInfo();

        // If no token or user info, stay on login page
        if (!token || !userInfo.userId || !userInfo.role) {
          removeToken(); // Clean up any partial data
          setCurrentPage("login");
          setUserRole(null);
          return;
        }

        // Verify token with backend to ensure it's still valid
        const response = await authAPI.verify();
        if (response.success) {
          setUserRole(response.data.role as UserRole);
          setCurrentPage("welcome");
        } else {
          // Token is invalid, clear everything and show login
          removeToken();
          setCurrentPage("login");
          setUserRole(null);
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        // Token verification failed, clear and show login
        removeToken();
        setCurrentPage("login");
        setUserRole(null);
      } finally {
        setIsVerifying(false);
        setIsInitialLoad(false);
      }
    };

    verifyToken();
  }, []);

  const handleLogin = (role: "admin" | "user") => {
    setUserRole(role);
    setCurrentPage("welcome");
  };

  const handleWelcomeStart = async () => {
    setIsVerifying(true);
    try {
      // Verify role from storage (in case it was updated elsewhere)
      const userInfo = getUserInfo();
      const currentRole = (userInfo.role as UserRole) || userRole;

      if (currentRole === "admin") {
        setCurrentPage("admin");
      } else {
        setCurrentPage("userDashboard");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Even if API call fails, still clear local state
      console.error("Logout API error:", err);
    }
    removeToken();
    setUserRole(null);
    setCurrentPage("login");
  };

  const handleCardClick = (cardType: string) => {
    if (cardType === "hanger-servicing") {
      setCurrentPage("hangerServicing");
    }
    if (cardType === "barcode-replacement") {
      setCurrentPage("barcodeCompletion");
    }
    if (cardType === "wheel-replacement") {
      setCurrentPage("wheelCompletion");
    }
    if (cardType === "checking-list") {
      setCurrentPage("checkingListCompletion");
    }
  };

  const handleNext = () => {
    // Navigate to Today's Activity page
    setCurrentPage("todayActivity");
  };

  const handleTodayActivityCardClick = (
    cardType: "service" | "barcode" | "wheel" | "checklist"
  ) => {
    if (cardType === "service") {
      setCurrentPage("serviceChecklist");
    }
    if (cardType === "barcode") {
      setCurrentPage("barcodeChecklist");
    }
    if (cardType === "wheel") {
      setCurrentPage("wheelChecklist");
    }
    if (cardType === "checklist") {
      setCurrentPage("checkingListChecklist");
    }
  };

  const handleBackToTodayActivity = () => {
    setCurrentPage("todayActivity");
  };

  const handleBarcodeComplete = () => {
    setBarcodeSubmissionTrigger((prev: number) => prev + 1);
    setCurrentPage("barcodeCompletion");
  };

  const handleWheelComplete = () => {
    setWheelSubmissionTrigger((prev: number) => prev + 1);
    setCurrentPage("wheelCompletion");
  };

  const handleCheckingListComplete = () => {
    setCheckingListSubmissionTrigger((prev: number) => prev + 1);
    setCurrentPage("checkingListCompletion");
  };

  const handleCompletionNext = () => {
    setCurrentPage("todayActivity");
  };

  const handleStartBarcodeChecklist = () => {
    setCurrentPage("barcodeChecklist");
  };

  const handleStartWheelChecklist = () => {
    setCurrentPage("wheelChecklist");
  };

  const handleStartCheckingListChecklist = () => {
    setCurrentPage("checkingListChecklist");
  };

  const handleBarcodeHangerClick = (hangerNo: number) => {
    setSelectedBarcodeHanger(hangerNo);
    setCurrentPage("barcodeChecklist");
  };

  const handleWheelHangerClick = (hangerNo: number) => {
    setSelectedWheelHanger(hangerNo);
    setCurrentPage("wheelChecklist");
  };

  const handleCheckingListHangerClick = (hangerNo: number) => {
    setSelectedCheckingListHanger(hangerNo);
    setCurrentPage("checkingListChecklist");
  };

  const handleOpenChecklistReport = () => {
    setCurrentPage("checklistItemsManager");
  };

  const handleBackFromReport = () => {
    setCurrentPage("admin");
  };

  const handleBackFromItemsManager = () => {
    setCurrentPage("admin");
  };

  // Show loading state during initial verification
  if (isInitialLoad && isVerifying) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0b5d3b] to-[#0a4d30]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <AnimatePresence mode="wait">
        {currentPage === "login" && <Login onLogin={handleLogin} />}

        {currentPage === "welcome" && (
          <Welcome onStart={handleWelcomeStart} />
        )}

        {currentPage === "admin" && (
          <AdminDashboard
            onLogout={handleLogout}
            onBack={() => setCurrentPage("welcome")}
            onOpenReport={handleOpenChecklistReport}
          />
        )}

        {currentPage === "userDashboard" && (
          <UserDashboard
            onLogout={handleLogout}
            onCardClick={handleCardClick}
            onBack={() => setCurrentPage("welcome")}
          />
        )}

        {currentPage === "hangerServicing" && (
          <HangerServicing
            onLogout={handleLogout}
            onNext={handleNext}
            onBack={() => setCurrentPage("userDashboard")}
            onStartServiceChecklist={() => setCurrentPage("serviceChecklist")}
            onHangerClick={(hangerNo) => {
              setSelectedHangerNo(hangerNo);
              setCurrentPage("serviceChecklist");
            }}
            submissionTrigger={servicingSubmissionTrigger}
          />
        )}

        {currentPage === "todayActivity" && (
          <TodayActivity
            onLogout={handleLogout}
            onCardClick={handleTodayActivityCardClick}
            onBack={() => setCurrentPage("userDashboard")}
          />
        )}

        {currentPage === "serviceChecklist" && (
          <ServiceChecklist
            onLogout={handleLogout}
            onBack={() => setCurrentPage("hangerServicing")}
            hangerNo={selectedHangerNo}
            onSubmitSuccess={() => {
              setSelectedHangerNo(null);
              setServicingSubmissionTrigger((prev: number) => prev + 1);
              setCurrentPage("hangerServicing");
            }}
          />
        )}

        {currentPage === "barcodeChecklist" && (
          <BarcodeChecklist
            onLogout={handleLogout}
            onBack={handleBackToTodayActivity}
            onNext={handleBarcodeComplete}
            initialHanger={selectedBarcodeHanger}
          />
        )}

        {currentPage === "wheelChecklist" && (
          <WheelChecklist
            onLogout={handleLogout}
            onBack={handleBackToTodayActivity}
            onNext={handleWheelComplete}
            initialHanger={selectedWheelHanger}
          />
        )}

        {currentPage === "checkingListChecklist" && (
          <CheckingListChecklist
            onLogout={handleLogout}
            onBack={handleBackToTodayActivity}
            onNext={handleCheckingListComplete}
            initialHanger={selectedCheckingListHanger}
          />
        )}

        {currentPage === "barcodeCompletion" && (
          <BarcodeCompletion
            onLogout={handleLogout}
            onNext={handleCompletionNext}
            onBack={() => setCurrentPage("userDashboard")}
            onStartChecklist={handleStartBarcodeChecklist}
            onHangerClick={handleBarcodeHangerClick}
            submissionTrigger={barcodeSubmissionTrigger}
          />
        )}

        {currentPage === "wheelCompletion" && (
          <WheelCompletion
            onLogout={handleLogout}
            onNext={handleCompletionNext}
            onBack={() => setCurrentPage("userDashboard")}
            onStartChecklist={handleStartWheelChecklist}
            onHangerClick={handleWheelHangerClick}
            submissionTrigger={wheelSubmissionTrigger}
          />
        )}

        {currentPage === "checkingListCompletion" && (
          <CheckingListCompletion
            onLogout={handleLogout}
            onNext={handleCompletionNext}
            onBack={() => setCurrentPage("userDashboard")}
            onStartChecklist={handleStartCheckingListChecklist}
            onHangerClick={handleCheckingListHangerClick}
            submissionTrigger={checkingListSubmissionTrigger}
          />
        )}

        {currentPage === "checklistReport" && (
          <div>
            <ChecklistReport />
            <button
              onClick={handleBackFromReport}
              className="fixed top-4 left-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ← Back to Admin
            </button>
            <button
              onClick={handleLogout}
              className="fixed top-4 right-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        )}

        {currentPage === "checklistItemsManager" && (
          <ChecklistItemsManager
            onBack={handleBackFromItemsManager}
            onLogout={handleLogout}
          />
        )}

        {currentPage === "hotspotQRCode" && (
          <div>
            <HotspotQRCode />
            <button
              onClick={() => setCurrentPage("admin")}
              className="fixed top-4 left-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ← Back to Admin
            </button>
          </div>
        )}

        {currentPage === "captivePortal" && (
          <CaptivePortal />
        )}
      </AnimatePresence>
    </div>
  );
}
