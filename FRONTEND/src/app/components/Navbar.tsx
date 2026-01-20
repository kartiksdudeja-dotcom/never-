interface NavbarProps {
  onUsersClick?: () => void;
  onLogout: () => void;
  title?: string;
  showUsersButton?: boolean;
}

export function Navbar({ onUsersClick, onLogout, title = "EMS Admin", showUsersButton = true }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="px-4 md:px-6 py-3 md:py-4 max-w-7xl md:mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0b5d3b] rounded md:hidden"></div>
            <span className="text-lg md:text-xl font-semibold text-gray-800">{title}</span>
          </div>
          
          <div className="flex gap-2 md:gap-3">
            {showUsersButton && onUsersClick && (
              <button
                onClick={onUsersClick}
                className="px-4 md:px-5 py-2 bg-white border-2 border-[#0b5d3b] text-[#0b5d3b] rounded-lg text-sm md:text-base font-medium md:font-medium hover:bg-[#0b5d3b] hover:text-white transition-all active:scale-95"
              >
                Users
              </button>
            )}
            <button
              onClick={onLogout}
              className="px-4 md:px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm md:text-base font-medium hover:bg-gray-200 transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}