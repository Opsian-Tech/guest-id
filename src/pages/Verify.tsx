import { useEffect, useState, useCallback, useRef } from "react";
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

const RETRY_DELAYS = [500, 1500, 3000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // Visitor access fields (from backend)
  visitorAccessCode?: string;
  visitorAccessGrantedAt?: string;
  visitorAccessExpiresAt?: string;

  // Optional context (safe to keep even if you don't display it)
  propertyExternalId?: string;
  doorKey?: string;
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

  const hasLoadedRef = useRef(false);

  const
