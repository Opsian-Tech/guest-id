import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VerificationData } from "@/pages/Verify";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

type Props = {
  data: VerificationData;
  updateData: (data: Partial<VerificationData>) => void;
  onNext: () => void;
  onError: (error: Error) => void;
};

const VisitorWelcomeStep = ({ data, updateData, onNext, onError }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(data.visitorFirstName || "");
  const [lastName, setLastName] = useState(data.visitorLastName || "");
  const [phone, setPhone] = useState(data.visitorPhone || "");
  const [reason, setReason] = useState(data.visitorReason || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!firstName || !lastName || !phone || !reason) {
      toast({
        title: t("common.error"),
        description: t("visitor.allFieldsRequired"),
        variant: "destructive",
      });
      return;
    }

    // Must have token (created during consent/start)
    if (!data.sessionToken) {
      toast({
        title: "Session error",
        description: "No session token found. Please restart.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await api.verify({
        action: "update_guest",
        session_token: data.sessionToken,
        flow_type: "visitor",
        visitor_first_name: firstName,
        visitor_last_name: lastName,
        visitor_phone: phone,
        visitor_reason: reason,
      } as any);

      // Update local state
      updateData({
        visitorFirstName: firstName,
        visitorLastName: lastName,
        visitorPhone: phone,
        visitorReason: reason,
      });

      // Move forward
      onNext();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to save visitor info");

      console.error("[VisitorWelcomeStep] update_guest failed:", error);

      toast({
        title: t("common.error"),
        description: "Could not save your details. Please check your connection and try again.",
        variant: "destructive",
      });

      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-3xl p-8 md:p-12"
    >
      <h2 className="text-3xl md:text-4xl font-thin text-white mb-4 text-center">
        {t("visitor.welcomeTitle")}
      </h2>
      <p className="text-white/80 text-center mb-8">{t("visitor.welcomeSubtitle")}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-white text-lg">
              {t("visitor.firstName")}
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder={t("visitor.firstNamePlaceholder")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-white text-lg">
              {t("visitor.lastName")}
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder={t("visitor.lastNamePlaceholder")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-white text-lg">
            {t("visitor.phoneNumber")}
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder={t("visitor.phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-white text-lg">
            {t("visitor.reason")}
          </Label>
          <Textarea
            id="reason"
            placeholder={t("visitor.reasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px] text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" disabled={isLoading} variant="glass" className="w-full h-14 text-lg font-bold">
          {isLoading ? t("welcome.starting") : t("welcome.startVerification")}
        </Button>
      </form>
    </motion.div>
  );
};

export default VisitorWelcomeStep;
