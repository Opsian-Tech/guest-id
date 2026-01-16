import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import WelcomeStep from "@/components/verify/WelcomeStep";
import VisitorWelcomeStep from "@/components/verify/VisitorWelcomeStep";
import DocumentStep from "@/components/verify/DocumentStep";
import SelfieStep from "@/components/verify/SelfieStep";
import ResultsStep from "@/components/verify/ResultsStep";
import VisitorResultsStep from "@/components/verify/VisitorResultsStep";
import ConsentModal from "@/components/verify/ConsentModal";
import GuestProgressIndicator from "@/components/verify/GuestProgressIndicator";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { api } from "@/lib/api";

export type FlowType = "guest" | "visitor";

export type VerificationData = {
  guestName: string;
  roomNumber?: string;
  sessionToken?: string;
  verificationScore?: number;
  isVerified?: boolean;
  consentGiven?: boolean;
  consentTime?: string;
  documentImage?: string;
  selfieImage?: string;
  livenessScore?: number;
  faceMatchScore?: number;

  guestVerified?: boolean;
  expectedGuestCount?: number;
  verifiedGuestCount?: number;
  guestIndex?: number;
  requiresAdditionalGuest?: boolean;

  flowType?: FlowType;

  visitorFirstName?: string;
  visitorLastName?: string;
  visitorPhone?: string;
  visitorReason?: string;
  visitorAccessCode?: string;
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

  const [pendingFlowType, setPendingFlowType] = useState<FlowType>("guest");

  const [data, setData] = useState<VerificationData>({
    guestName: "",
    roomNumber: "",
  });

  useEffect(() => {
    const loadSession = async () => {
      if (!token || token === "new") {
        const params = new URLSearchParams(window.location.search);
        const flow = params.get("flow") === "visitor" ? "visitor" : "guest";
        setPendingFlowType(flow);
        setShowConsent(true);
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.verify({
          action: "get_session",
          session_token: token,
        } as any);

        const session = res.session;

        const flowType: FlowType = (session as any).flow_type === "visitor" ? "visitor" : "guest";

        setData({
          guestName: session.guest_name || "",
          roomNumber: session.room_number || "",
          sessionToken: session.session_token,

          consentGiven: session.consent_given,
          consentTime: session.consent_time,

          isVerified: session.is_verified,
          verificationScore: session.verification_score,

          expectedGuestCount: session.expected_guest_count,
          verifiedGuestCount: session.verified_guest_count,
          guestIndex: session.guest_index,
          requiresAdditionalGuest: session.requires_additional_guest,

          flowType,

          visitorFirstName: (session as any).visitor_first_name,
          visitorLastName: (session as any).visitor_last_name,
          visitorPhone: (session as any).visitor_phone,
          visitorReason: (session as any).visitor_reason,
          visitorAccessCode: (session as any).visitor_access_code,
        });

        setShowConsent(session.consent_given !== true);
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

  const handleConsent = (sessionToken: string, flowType?: FlowType) => {
    const finalFlow: FlowType = flowType === "visitor" ? "visitor" : "guest";

    setShowConsent(false);
    updateData({
      sessionToken,
      consentGiven: true,
      consentTime: new Date().toISOString(),
      flowType: finalFlow,
    });

    navigate(`/verify/${sessionToken}?flow=${finalFlow}`, { replace: true });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading session…</div>;
  }

  const isVisitorFlow = data.flowType === "visitor";

  return (
    <>
      {showConsent && (
        <ConsentModal
          flowType={pendingFlowType}
          onConsent={(sessionToken) => handleConsent(sessionToken, pendingFlowType)}
          onCancel={() => navigate("/")}
        />
      )}

      <div className="min-h-screen flex items-center justify-center p-4 pb-20">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-2xl">
          {!isVisitorFlow && <GuestProgressIndicator data={data} />}

          <AnimatePresence mode="wait">
            {step === 1 &&
              (isVisitorFlow ? (
                <VisitorWelcomeStep
                  data={data}
                  updateData={updateData}
                  onNext={() => setStep(2)}
                  onError={(e) => toast({ title: "Error", description: e.message })}
                />
              ) : (
                <WelcomeStep
                  data={data}
                  updateData={updateData}
                  onNext={() => setStep(2)}
                  onError={(e) => toast({ title: "Error", description: e.message })}
                />
              ))}

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

            {step === 4 &&
              (isVisitorFlow ? (
                <VisitorResultsStep data={data} onHome={() => navigate("/")} />
              ) : (
                <ResultsStep
                  data={data}
                  onRetry={() => navigate("/verify/new?flow=guest")}
                  onHome={() => navigate("/")}
                />
              ))}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Verify;
