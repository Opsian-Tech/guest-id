import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, Clock } from "lucide-react";
import { VerificationData } from "@/pages/Verify";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  data: VerificationData;
  onHome: () => void;
};

const VisitorResultsStep = ({ data, onHome }: Props) => {
  const { t } = useTranslation();

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  // Generate a 6-digit access code (in real app, this would come from backend)
  const accessCode = data.visitorAccessCode || "454545";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-3xl p-8 md:p-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <CheckCircle2 className="w-24 h-24 text-green-400 mx-auto mb-6" />
      </motion.div>

      <h2 className="text-4xl md:text-5xl font-thin text-white mb-4">
        {t("visitor.accessGranted")}
      </h2>

      {/* Time limit indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <Clock className="w-5 h-5 text-white/70" />
        <p className="text-xl text-white/80">{t("visitor.validFor30Minutes")}</p>
      </div>

      {/* Large access code display */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-8 mb-8 shadow-lg"
      >
        <p className="text-gray-500 text-sm mb-2 uppercase tracking-wide">
          {t("visitor.accessCode")}
        </p>
        <p className="text-6xl md:text-7xl font-bold text-gray-900 tracking-widest">
          {accessCode}
        </p>
      </motion.div>

      {/* Visitor summary */}
      <div className="glass rounded-xl p-5 mb-8 text-left">
        <h3 className="text-white/60 text-sm uppercase tracking-wide mb-3">
          {t("visitor.visitorDetails")}
        </h3>
        <div className="space-y-2">
          <p className="text-white text-lg">
            <span className="text-white/60">{t("visitor.name")}:</span>{" "}
            {data.visitorFirstName} {data.visitorLastName}
          </p>
          <p className="text-white text-lg">
            <span className="text-white/60">{t("visitor.phone")}:</span>{" "}
            {data.visitorPhone}
          </p>
          <p className="text-white text-lg">
            <span className="text-white/60">{t("visitor.purpose")}:</span>{" "}
            {data.visitorReason}
          </p>
        </div>
      </div>

      {/* Data deletion note */}
      <div className="glass rounded-xl p-4 mb-8">
        <p className="text-xs text-white/70 text-center leading-relaxed">
          {t("results.deletionNote")}
        </p>
      </div>

      <Button
        onClick={onHome}
        variant="glass"
        className="w-full h-14 text-lg font-bold"
      >
        <Home className="w-5 h-5 mr-2" />
        {t("results.backToHome")}
      </Button>
    </motion.div>
  );
};

export default VisitorResultsStep;
