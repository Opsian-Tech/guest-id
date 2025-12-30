import { useEffect, useState } from "react";
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
import { api } from "@/lib/api";

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

const stepFromBackend = (step?: string): number => {
  switch (step) {
    case "document":
      return 2;
    case "selfie":
      return 3;
    case "results":
      return 4;
    case "welcome":
    default:
      return 1;
  }
};

const Verify = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [showConsent, setShowConsent] = useState(true);

  const [data, setData] = useState<VerificationData>({
    guestName: "",
    roomNumber: "",
    consentGiven: false,
  });

  // 🔁 RESUME SESSION ON LOAD / REFRESH
  useEffect(() => {
    const resumeSession = async () => {
      if (!token || token === "new") {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.verify({
          action: "get_session",
          session_token: token,
        });

        if (!res?.session) {
          throw new Error("Session not found");
        }

        const session = res.session;

        setData({
          guestName: session.guest_name || "",
          roomNumber: session.room_number || "",
          sessionToken: session.session_token,
          consentGiven: session.consent_given || false,
          consentTime: session.consent_time || undefined,
          isVerified: session.is_verified || false,
          verificationScore: session.verification_score || undefined,
        });

        setShowConsent(!session.consent_given);
        setStep(stepFromBackend(session.current_step));
      } catch (err: any) {
        toast({
          title: "Session expired",
          description: "Please restart verification.",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    resumeSession();
  }, [token, navigate, toast]);

  const updateData = (newData: Partial<VerificationData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleRetry = () => {
    setStep(1);
    setData({ guestName: "", roomNumber: "" });
    setShowConsent(true);
  };

  const handleConsent = (sessionToken: string) => {
    setShowConsent(false);
    updateData({
      sessionToken,
      consentGiven: true,
      consentTime: new Date().toISOString(),
    });
  };

  const handleConsentCancel = () => navigate("/");

  const handleError = (error: Error) => {
    toast({
      title: "Error",
      description: error.message || "An error occurred.",
      variant: "destructive",
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading session…</div>;
  }

  return (
    <>
      {showConsent && <ConsentModal onConsent={handleConsent} onCancel={handleConsentCancel} />}

      <div className="min-h-screen flex items-center justify-center p-4 pb-20">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-2xl">
          {/* Progress */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step >= num ? "bg-white text-primary" : "bg-white/20 text-white/50"
                    }`}
                  >
                    {num}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <WelcomeStep data={data} updateData={updateData} onNext={handleNext} onError={handleError} />
            )}

            {step === 2 && (
              <DocumentStep
                data={data}
                updateData={updateData}
                onNext={handleNext}
                onBack={handleBack}
                onError={handleError}
              />
            )}

            {step === 3 && (
              <SelfieStep
                data={data}
                updateData={updateData}
                onNext={handleNext}
                onBack={handleBack}
                onError={handleError}
              />
            )}

            {step === 4 && <ResultsStep data={data} onRetry={handleRetry} onHome={() => navigate("/")} />}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Verify;
