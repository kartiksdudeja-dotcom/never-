import { motion } from "motion/react";
import { Wrench, Barcode, CircleDot, ClipboardCheck } from "lucide-react";
import { Navbar } from "../components/Navbar";

interface TodayActivityProps {
  onLogout: () => void;
  onCardClick: (
    cardType: "service" | "barcode" | "wheel" | "checklist"
  ) => void;
  onBack: () => void;
}

export function TodayActivity({
  onLogout,
  onCardClick,
  onBack,
}: TodayActivityProps) {
  const cards = [
    {
      id: "service" as const,
      title: "Service",
      icon: Wrench,
      color: "from-[#0b5d3b] to-[#0a4d30]",
    },
    {
      id: "barcode" as const,
      title: "Barcode",
      icon: Barcode,
      color: "from-gray-700 to-gray-900",
    },
    {
      id: "wheel" as const,
      title: "Wheel",
      icon: CircleDot,
      color: "from-[#0b5d3b] to-[#074d2c]",
    },
    {
      id: "checklist" as const,
      title: "Checking List",
      icon: ClipboardCheck,
      color: "from-[#10b981] to-[#059669]",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar onLogout={onLogout} title="EMS Hanger" showUsersButton={false} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 md:py-12 pt-20 md:pt-24"
      >
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Today's Activity
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            Select an activity to continue
          </p>
          <button
            onClick={onBack}
            className="text-[#0b5d3b] hover:underline font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onClick={() => onCardClick(card.id)}
                className="cursor-pointer group"
              >
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
                  <div
                    className={`bg-gradient-to-br ${card.color} p-8 md:p-12 flex items-center justify-center`}
                  >
                    <Icon className="w-20 h-20 md:w-24 md:h-24 text-white group-hover:scale-110 transition-transform duration-300" />
                  </div>

                  <div className="p-6 md:p-8 text-center">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                      {card.title}
                    </h3>
                    <p className="text-gray-600">Click to manage</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
