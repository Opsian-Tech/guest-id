import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

interface ConsentModalProps {
  onConsent: (sessionToken: string) => void;
  onCancel: () => void;
}

const ConsentModal = ({ onConsent, onCancel }: ConsentModalProps) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleConsent = async () => {
    setIsLoading(true);

    try {
      // Step 1: Create session
      console.log("[Consent Flow] Starting session creation");

      const startResponse = await api.verify({
        action: "start",
      });

      const sessionToken = startResponse.session_token;
      if (!sessionToken) {
        throw new Error("No session token returned from server");
      }

      console.log("[Consent Flow] Session created:", sessionToken);

      // Step 2: Log consent
      console.log("[Consent Flow] Logging consent");

      await api.verify({
        action: "log_consent",
        session_token: sessionToken,
        consent_given: true,
        consent_time: new Date().toISOString(),
        consent_locale: "en-th",
      });

      console.log("[Consent Flow] Consent logged successfully");

      // Proceed
      onConsent(sessionToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      console.error("[Consent Flow] ERROR:", error);

      toast({
        title: "Error",
        description: `Failed to process consent: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-6 md:p-8 max-w-3xl w-full my-8 flex flex-col max-h-[90vh]"
      >
        <h2 className="text-2xl md:text-3xl font-thin text-white mb-3 md:mb-6 text-center">{t("consent.title")}</h2>

        <ScrollArea className="flex-1 mb-4 md:mb-6 -mr-4 pr-6 h-full overflow-y-auto">
          <div className="space-y-4 md:space-y-6 text-white/90 text-sm md:text-base pr-2">
            <div>
              <p className="leading-relaxed mb-3">{t("consent.intro")}</p>
              <p className="leading-relaxed mb-2 font-semibold">{t("consent.dataCollection")}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>{t("consent.item1")}</li>
                <li>{t("consent.item2")}</li>
                <li>{t("consent.item3")}</li>
              </ul>
              <p className="leading-relaxed mt-4 mb-2 font-semibold">{t("consent.purpose")}</p>
              <p className="leading-relaxed">{t("consent.purposeText")}</p>
              <p className="leading-relaxed mt-4 mb-2 font-semibold">{t("consent.storage")}</p>
              <p className="leading-relaxed">{t("consent.storageText")}</p>
              <p className="leading-relaxed mt-4 mb-2 font-semibold">{t("consent.rights")}</p>
              <p className="leading-relaxed">{t("consent.rightsText")}</p>
            </div>
            <div className="pt-4 md:pt-6 border-t border-white/20">
              <h4 className="text-lg md:text-xl font-semibold text-white mb-2 md:mb-3">{t("consent.thaiTitle")}</h4>
              <p className="leading-relaxed">{t("consent.thaiText")}</p>
            </div>
          </div>
        </ScrollArea>

        {/* Consent Checkbox */}
        <div className="flex items-start space-x-3 mb-4 md:mb-6 p-3 md:p-4 glass rounded-xl flex-shrink-0">
          <Checkbox
            id="consent"
            checked={isChecked}
            onCheckedChange={(checked) => setIsChecked(checked === true)}
            className="mt-1 flex-shrink-0"
          />
          <label htmlFor="consent" className="text-xs md:text-sm text-white leading-relaxed cursor-pointer flex-1">
            {t("consent.agreement")}
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3 flex-shrink-0">
          <Button
            onClick={handleConsent}
            disabled={!isChecked || isLoading}
            className="w-full md:flex-1 h-12 md:h-14 text-base md:text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("common.loading")}
              </>
            ) : (
              t("consent.continue")
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full md:flex-1 h-12 md:h-14 text-base md:text-lg text-white hover:bg-white/10"
            disabled={isLoading}
          >
            {t("consent.cancel")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConsentModal;
