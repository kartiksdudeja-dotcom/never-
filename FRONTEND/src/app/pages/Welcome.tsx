import { motion } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

interface WelcomeProps {
  onStart: () => void;
}

export function Welcome({ onStart }: WelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4 md:p-8"
    >
      <div className="max-w-md md:max-w-4xl w-full text-center">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-3 md:mb-4">
            Welcome !!
          </h1>
          <h2 className="text-xl md:text-3xl text-[#0b5d3b] font-semibold mb-8 md:mb-12 px-4 md:px-0">
            EMS Hanger Activity Log System
          </h2>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-8 md:mb-12 relative px-2 md:px-0 flex justify-center"
        >
          {/* Tag-shaped card container */}
          <div className="relative bg-white rounded-2xl shadow-xl p-3 md:p-4 max-w-lg md:max-w-2xl">
            {/* Tag hole at top-right corner */}
            <div className="absolute top-3 right-3 md:top-4 md:right-4 w-6 h-6 md:w-8 md:h-8 bg-gray-100 rounded-full border-2 border-gray-200 shadow-inner"></div>
            
            {/* Image container */}
            <div className="rounded-xl overflow-hidden">
              <ImageWithFallback
                src="/assests/EMS-HANGER.jpg"
                alt="EMS Hanger"
                className="w-full h-[280px] md:h-[400px] object-contain bg-white"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-12 md:mt-16 px-4 md:px-0 md:flex md:justify-end md:max-w-2xl md:mx-auto"
        >
          <button
            onClick={onStart}
            className="w-full md:w-auto px-8 md:px-10 py-4 bg-[#0b5d3b] text-white text-lg md:text-xl font-semibold rounded-xl hover:bg-[#0a4d30] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            Click to Start →
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}