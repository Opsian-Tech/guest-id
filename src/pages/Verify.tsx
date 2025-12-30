import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeStep from "@/components/verify/WelcomeStep";
import DocumentStep from "@/components/verify/DocumentStep";
import SelfieStep from "@/components/verify/SelfieStep";
import ResultsStep from "@/components/verify/ResultsStep";
import ConsentModal from "@/components/verify/ConsentModal";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export type VerificationData = {
  guestName: string;
  roomNumber: string;
  sessionToken?: string;
  documentImage?: string;
  selfieImage?: string;
  verificationScore?: number;
  isVerified?: boolean;
  livenessScore?: number;
  faceMatchScore?: number;
  consentGiven?: boolean;
  consentTime?: string;
};

const Verify = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [showConsent, setShowConsent] = useState(false);
  const [data, setData] = useState<VerificationData>({
    guestName: "",
    roomNumber: "",
    consentGiven: false,
  });

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  const handleRetry = () => {
    setStep(1);
    setData({ guestName: "", roomNumber: "" });
  };

  const updateData = (newData: Partial<VerificationData>) => {
    setData({ ...data, ...newData });
  };

  const handleConsent = (sessionToken: string) => {
    setShowConsent(false);
    updateData({
      sessionToken,
      consentGiven: true,
      consentTime: new Date().toISOString(),
    });
  };

  const handleConsentCancel = () => {
    navigate("/");
  };

  const handleError = (error: Error) => {
    toast({
      title: "Error",
      description: error.message || "An error occurred. Please try again.",
      variant: "destructive",
    });
  };

  return (
    <>
      {showConsent && <ConsentModal onConsent={handleConsent} onCancel={handleConsentCancel} />}

      <div className="min-h-screen flex items-center justify-center p-4 pb-20">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-2xl">
          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                      step >= num ? "bg-white text-primary" : "bg-white/20 text-white/50"
                    }`}
                  >
                    {num}
                  </div>
                  {num < 4 && (
                    <div
                      className={`hidden md:block w-16 h-1 mx-2 transition-all duration-300 ${
                        step > num ? "bg-white" : "bg-white/20"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <WelcomeStep
                key="welcome"
                data={data}
                updateData={updateData}
                onNext={handleNext}
                onError={handleError}
              />
            )}
            {step === 2 && (
              <DocumentStep
                key="document"
                data={data}
                updateData={updateData}
                onNext={handleNext}
                onBack={handleBack}
                onError={handleError}
              />
            )}
            {step === 3 && (
              <SelfieStep
                key="selfie"
                data={data}
                updateData={updateData}
                onNext={handleNext}
                onBack={handleBack}
                onError={handleError}
              />
            )}
            {step === 4 && <ResultsStep key="results" data={data} onRetry={handleRetry} onHome={() => navigate("/")} />}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Verify;
