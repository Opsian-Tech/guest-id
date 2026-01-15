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
  verificationScore?: number;
  isVerified?: boolean;
  consentGiven?: boolean;
  consentTime?: string;
  documentImage?: string;
  selfieImage?: string;
  livenessScore?: number;
  faceMatchScore?: number;
  // Multi-guest verification fields
  expectedGuestCount?: number;
  verifiedGuestCount?: number;
  guestIndex?: number;
  requiresAdditionalGuest?: boolean;
};

const stepFromBackend = (step?: string) => {
  switch (step) {
    case "document":
      return 2;
    case "selfie":
      return 3;
    case "results":
      return 4;
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
  const [showConsent, setShowConsent] = useState(false);

  const [data, setData] = useState<VerificationData>({
    guestName: "",
    roomNumber: "",
  });

  // 🔁 RESUME SESSION ON LOAD / REFRESH
  useEffect(() => {
    const loadSession = async () => {
      if (!token || token === "new") {
        setShowConsent(true);
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.verify({
          action: "get_session",
          session_token: token,
        });

        const session = res.session;

        setData({
          guestName: session.guest_name || "",
          roomNumber: session.room_number || "",
          sessionToken: session.session_token,
          consentGiven: session.consent_given,
          consentTime: session.consent_time,
          isVerified: session.is_verified,
          verificationScore: session.verification_score,
        });

        // Determine consent visibility using BOTH local and backend state (null-safe)
        const localConsent = data.consentGiven === true;
        const backendConsent = session.consent_given === true;
        setShowConsent(!(localConsent || backendConsent));
        
        setStep(stepFromBackend(session.current_step));
      } catch {
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

    loadSession();
  }, [token, navigate, toast]);

  const updateData = (newData: Partial<VerificationData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleConsent = (sessionToken: string) => {
    setShowConsent(false);
    updateData({
      sessionToken,
      consentGiven: true,
      consentTime: new Date().toISOString(),
    });
    navigate(`/verify/${sessionToken}`, { replace: true });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading session…</div>;
  }

  return (
    <>
      {showConsent && <ConsentModal onConsent={handleConsent} onCancel={() => navigate("/")} />}

      <div className="min-h-screen flex items-center justify-center p-4 pb-20">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <WelcomeStep
                data={data}
                updateData={updateData}
                onNext={() => setStep(2)}
                onError={(e) => toast({ title: "Error", description: e.message })}
              />
            )}
            {step === 2 && (
              <DocumentStep
                data={data}
                updateData={updateData}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
                onError={(e) => toast({ title: "Error", description: e.message })}
              />
            )}
            {step === 3 && (
              <SelfieStep
                data={data}
                updateData={updateData}
                onNext={() => setStep(4)}
                onNextGuest={() => {
                  // Clear per-guest images for next guest
                  updateData({
                    documentImage: undefined,
                    selfieImage: undefined,
                  });
                  setStep(2);
                }}
                onBack={() => setStep(2)}
                onError={(e) => toast({ title: "Error", description: e.message })}
              />
            )}
            {step === 4 && (
              <ResultsStep data={data} onRetry={() => navigate("/verify/new")} onHome={() => navigate("/")} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Verify;
