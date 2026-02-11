import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Home, RotateCcw } from "lucide-react";
import { VerificationData } from "@/pages/Verify";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  data: VerificationData;
  onRetry: () => void;
  onHome: () => void;
};

const ResultsStep = ({ data, onRetry, onHome }: Props) => {
  const isSuccess = data.isVerified;
  const { t } = useTranslation();

  useEffect(() => {
    if (isSuccess) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isSuccess]);

  if (isSuccess) {
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
          {t('results.successTitle')}
        </h2>

        {/* Guest Info Card - White background for readability */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-lg">
          <p className="text-gray-800 text-lg mb-1">
            <strong>{t('results.guestName')}:</strong> {data.guestName}
          </p>
          <p className="text-gray-800 text-lg mb-1">
            <strong>{t('results.roomNumber')}:</strong> {data.roomNumber}
          </p>
          <p className="text-gray-800 text-lg mb-1">
            <strong>{t('results.physicalRoom')}:</strong> {data.physicalRoom || t('results.pendingAssignment')}
          </p>
          <p className="text-gray-800 text-lg">
            <strong>{t('results.roomKeyPasscode')}:</strong> {data.roomAccessCode || t('results.pending')}
          </p>
        </div>

        <div className="glass rounded-xl p-4 mb-8">
          <p className="text-xs text-white/70 text-center leading-relaxed">
            {t('results.deletionNote')}
          </p>
        </div>

        <p className="text-2xl text-white font-bold mb-6">
          {t('results.checkInComplete')}
        </p>

        <Button
          onClick={onHome}
          variant="glass"
          className="w-full h-14 text-lg font-bold"
        >
          <Home className="w-5 h-5 mr-2" />
          {t('results.backToHome')}
        </Button>
      </motion.div>
    );
  }

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
        <XCircle className="w-24 h-24 text-red-400 mx-auto mb-6" />
      </motion.div>

      <h2 className="text-4xl md:text-5xl font-thin text-white mb-4">
        {t('results.failureTitle')}
      </h2>

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="text-6xl font-bold text-red-400 mb-2">
          {(data.verificationScore * 100).toFixed(2)}%
        </div>
        <div className="text-white/80 text-lg">{t('results.verificationScore')}</div>
      </div>

      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-6">
        <p className="text-white text-lg mb-2">
          {t('results.whyFailed')}
        </p>
        <p className="text-white/80 text-left mt-2">
          {t('results.failureReasons')}
        </p>
      </div>

      <div className="glass rounded-xl p-4 mb-8">
        <p className="text-xs text-white/70 text-center leading-relaxed">
          {t('results.deletionNote')}
        </p>
      </div>

      <div className="flex gap-4">
        <Button
          onClick={onRetry}
          variant="glass"
          className="flex-1 h-14 text-lg font-bold"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          {t('results.tryAgain')}
        </Button>
        <Button
          onClick={onHome}
          variant="glass"
          className="flex-1 h-14 text-lg font-bold"
        >
          <Home className="w-5 h-5 mr-2" />
          {t('results.home')}
        </Button>
      </div>
    </motion.div>
  );
};

export default ResultsStep;
