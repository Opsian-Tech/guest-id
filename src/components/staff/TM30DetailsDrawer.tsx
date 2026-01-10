import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  ChevronDown,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ExtendedSessionRow,
  TM30Data,
  getTM30ReadyStatus,
  getConfidenceLevel,
  COMMON_NATIONALITIES,
  ConfidenceLevel,
} from "@/types/tm30";
import { exportSingleTM30 } from "@/lib/tm30ExportUtils";

interface TM30DetailsDrawerProps {
  session: ExtendedSessionRow;
  onSave: (sessionId: string, tm30Data: TM30Data) => void;
  onMarkReady: (sessionId: string) => void;
}

/**
 * Manual routing helpers:
 * Your Supabase structure is:
 * session.extracted_info = { text, textract_ok, textract_error, textract: { raw, mrz_parsed, ... } }
 */
const getMrzSex = (session: any) =>
  session?.extracted_info?.textract?.mrz_parsed?.sex || session?.extracted_info?.textract?.raw?.sex || "";

const getMrzNationality = (session: any) =>
  session?.extracted_info?.textract?.mrz_parsed?.nationality ||
  session?.extracted_info?.textract?.raw?.nationality ||
  "";

const getMrzCode = (session: any) =>
  session?.extracted_info?.textract?.raw?.mrz_code || session?.extracted_info?.mrz_code || "";

const getRaw = (session: any) => session?.extracted_info?.textract?.raw || {};

const getCreatedAtAsDefaultArrival = (session: any) => session?.created_at || null;

const TM30DetailsDrawer = ({ session, onSave, onMarkReady }: TM30DetailsDrawerProps) => {
  const { toast } = useToast();
  const [showMrz, setShowMrz] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmExtracted, setConfirmExtracted] = useState(false);
  const [showOtherNationality, setShowOtherNationality] = useState(false);

  // Extracted info object (as stored in Supabase)
  const extractedInfo: any = session?.extracted_info || {};
  const raw = getRaw(session);

  /**
   * TM30 form state
   * IMPORTANT:
   * - Initialize EMPTY
   * - Hydrate on session change (drawer opens on different row)
   * - Apply manual fallback routing:
   *   - sex from mrz_parsed.sex
   *   - nationality from mrz_parsed.nationality
   *   - arrival_date_time from created_at
   */
  const [formData, setFormData] = useState<TM30Data>({
    nationality: null,
    sex: null,
    arrival_date_time: null,
    // departure_date removed from staff UI (still allowed in TM30Data type, but we won't require it here)
    departure_date: null,
    property: null,
    room_number: null,
    notes: null,
  });

  const [originalData, setOriginalData] = useState<TM30Data>(formData);

  useEffect(() => {
    // Existing TM30 data from session (your UI uses session.tm30; backend stores tm30_info)
    // Keep your current schema, but hydrate with fallbacks.
    const existing: any = session?.tm30 || {};

    const routedSex = existing.sex || getMrzSex(session) || null;
    const routedNationality = existing.nationality || getMrzNationality(session) || null;

    // You requested: arrival_date_time from created_at (instead of reservation check-in time for now)
    const routedArrival = existing.arrival_date_time || getCreatedAtAsDefaultArrival(session) || null;

    const next: TM30Data = {
      nationality: routedNationality,
      sex: routedSex,
      arrival_date_time: routedArrival,
      // not shown in staff dashboard now
      departure_date: existing.departure_date || null,
      property: existing.property || session?.reservation?.property_name || null,
      room_number: existing.room_number || session?.room_number || null,
      notes: existing.notes || null,
    };

    setFormData(next);
    setOriginalData(next);

    // nationality "Other" UI toggle
    const nat = next.nationality || "";
    setShowOtherNationality(Boolean(nat) && !COMMON_NATIONALITIES.includes(nat));
  }, [session?.id]); // session.id is used throughout your component

  /**
   * READY / Missing Fields
   * You asked to remove Departure Date from staff-dashboard.
   * We will:
   * - call getTM30ReadyStatus(formData) (existing logic)
   * - then manually remove departure_date from missing list
   * - and treat ready as "ready if everything except departure_date is present"
   */
  const status = getTM30ReadyStatus(formData);
  const missingFields = (status?.missingFields || []).filter((f: any) => f !== "departure_date");
  const ready = Boolean(status?.ready) && !missingFields.includes("departure_date");

  // Confidence checks (based on extracted_info fields if present)
  const nameConfidence = getConfidenceLevel(extractedInfo?.name_confidence);
  const passportConfidence = getConfidenceLevel(extractedInfo?.passport_confidence);
  const hasLowConfidence = nameConfidence === "low" || passportConfidence === "low";
  const hasAnyConfidence = nameConfidence !== null || passportConfidence !== null;

  const canMarkReady = ready && (!hasLowConfidence || confirmExtracted);

  const handleCopyMrz = async () => {
    const mrz = getMrzCode(session);
    if (mrz) {
      await navigator.clipboard.writeText(mrz);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSave(session.id, formData);
    setSaving(false);
    toast({ title: "Saved", description: "TM30 data has been saved." });
  };

  const handleMarkReady = () => {
    onMarkReady(session.id);
    toast({ title: "TM30 Ready", description: "Record marked as TM30 Ready." });
  };

  const handleCancel = () => {
    setFormData(originalData);
    const nat = originalData.nationality || "";
    setShowOtherNationality(Boolean(nat) && !COMMON_NATIONALITIES.includes(nat));
  };

  const handleExport = (format: "csv" | "json" | "pdf") => {
    if (format === "pdf") {
      toast({
        title: "PDF Export",
        description: "PDF export will be enabled once server endpoint is connected.",
        variant: "default",
      });
      return;
    }
    exportSingleTM30(session, format);
    toast({ title: "Exported", description: `TM30 data exported as ${format.toUpperCase()}.` });
  };

  const handleNationalityChange = (value: string) => {
    if (value === "__other__") {
      setShowOtherNationality(true);
      setFormData((prev) => ({ ...prev, nationality: "" }));
    } else {
      setShowOtherNationality(false);
      setFormData((prev) => ({ ...prev, nationality: value }));
    }
  };

  const renderExtractedField = (label: string, value: string | null | undefined) => {
    const isEmpty = !value;
    return (
      <div className="space-y-1">
        <Label className={`text-xs ${isEmpty ? "text-amber-400" : "text-gray-500"}`}>
          {label} {isEmpty && <span className="text-amber-400">⚠</span>}
        </Label>
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-900 text-sm border border-gray-200">
          {value || "—"}
        </div>
      </div>
    );
  };

  const renderConfidenceBadge = (level: ConfidenceLevel | null, label: string) => {
    if (!level) return null;
    const colors = {
      high: "bg-green-500/20 text-green-700 border-green-500/30",
      medium: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
      low: "bg-red-500/20 text-red-700 border-red-500/30",
    };
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">{label}:</span>
        <Badge className={colors[level]} variant="outline">
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </Badge>
      </div>
    );
  };

  const renderRequiredInput = (
    label: string,
    field: keyof TM30Data,
    type: "text" | "date" | "datetime-local" = "text",
    placeholder?: string,
  ) => {
    const isMissing = missingFields.includes(field as any);
    const value = (formData[field] as any) || "";

    return (
      <div className="space-y-1">
        <Label className={`text-xs ${isMissing ? "text-red-400" : "text-gray-500"}`}>
          {label} <span className="text-red-400">*</span>
        </Label>
        <Input
          type={type}
          value={value as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, [field]: e.target.value || null }))}
          placeholder={placeholder}
          className={`bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 ${
            isMissing ? "border-red-500/50 ring-1 ring-red-500/30" : ""
          }`}
        />
        {isMissing && <p className="text-red-400 text-xs">Required</p>}
      </div>
    );
  };

  const mrzCode = getMrzCode(session);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="p-6 bg-white border-t border-gray-200 shadow-lg rounded-b-lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">TM30 Details</h3>
            <Badge
              className={
                ready
                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }
            >
              {ready ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> TM30 Ready
                </>
              ) : (
                <>TM30 Missing Fields ({missingFields.length})</>
              )}
            </Badge>
          </div>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Download className="w-4 h-4 mr-2" />
                Export TM30
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-gray-200">
              <DropdownMenuItem
                onClick={() => handleExport("csv")}
                className="text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("json")}
                className="text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <FileJson className="w-4 h-4 mr-2" /> JSON
              </DropdownMenuItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={() => handleExport("pdf")}
                      className="text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      <FileText className="w-4 h-4 mr-2" /> PDF
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>PDF export will be enabled once server endpoint is connected</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Missing fields summary */}
        {!ready && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Missing: {missingFields.map((f: any) => String(f).replace(/_/g, " ")).join(", ")}
            </p>
          </div>
        )}

        {/* Confidence warning */}
        {hasLowConfidence && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-600 text-sm mb-2">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Low confidence detected. Please confirm extracted values before marking TM30 Ready.
            </p>
            <label className="flex items-center gap-2 text-gray-700 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={confirmExtracted}
                onChange={(e) => setConfirmExtracted(e.target.checked)}
                className="rounded border-gray-300"
              />
              Confirm extracted fields are correct
            </label>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION A: Extracted (Read-Only) */}
          <div className="space-y-4">
            <h4 className="text-gray-700 font-medium text-sm uppercase tracking-wide border-b border-gray-200 pb-2">
              Extracted (Read-Only)
            </h4>

            {/* Confidence panel */}
            {hasAnyConfidence && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Confidence</p>
                <div className="flex flex-wrap gap-3">
                  {renderConfidenceBadge(nameConfidence, "Name")}
                  {renderConfidenceBadge(passportConfidence, "Passport")}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {renderExtractedField("First Name", raw?.first_name || null)}
              {renderExtractedField("Middle Name", raw?.middle_name || null)}
              {renderExtractedField("Last Name", raw?.last_name || null)}
              {renderExtractedField("Document Number", raw?.document_number || null)}
              {renderExtractedField("Date of Birth", raw?.date_of_birth || null)}
              {renderExtractedField("Date of Issue", raw?.date_of_issue || null)}
              {renderExtractedField("Expiration Date", raw?.expiration_date || null)}
              {renderExtractedField("ID Type", raw?.id_type || null)}
            </div>

            {/* MRZ Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500">MRZ Code</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMrz(!showMrz)}
                  className="text-gray-500 hover:text-gray-700 h-6 px-2"
                >
                  {showMrz ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  {showMrz ? "Hide" : "Show"}
                </Button>
              </div>
              {showMrz && mrzCode && (
                <div className="relative">
                  <pre className="bg-gray-900 rounded-lg p-3 text-green-400 text-xs font-mono overflow-x-auto border border-gray-700">
                    {mrzCode}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyMrz}
                    className="absolute top-2 right-2 h-6 px-2 text-gray-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              )}
              {showMrz && !mrzCode && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm border border-gray-200">
                  No MRZ data available
                </div>
              )}
            </div>
          </div>

          {/* SECTION B: TM30 Required (Editable) */}
          <div className="space-y-4">
            <h4 className="text-gray-700 font-medium text-sm uppercase tracking-wide border-b border-gray-200 pb-2">
              TM30 Required (Editable)
            </h4>

            <div className="space-y-4">
              {/* Nationality */}
              <div className="space-y-1">
                <Label
                  className={`text-xs ${missingFields.includes("nationality" as any) ? "text-red-400" : "text-gray-500"}`}
                >
                  Nationality <span className="text-red-400">*</span>
                </Label>
                {showOtherNationality ? (
                  <div className="flex gap-2">
                    <Input
                      value={formData.nationality || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nationality: e.target.value || null }))}
                      placeholder="Enter nationality"
                      className={`bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 ${
                        missingFields.includes("nationality" as any) ? "border-red-500/50 ring-1 ring-red-500/30" : ""
                      }`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOtherNationality(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Back
                    </Button>
                  </div>
                ) : (
                  <Select value={formData.nationality || ""} onValueChange={handleNationalityChange}>
                    <SelectTrigger
                      className={`bg-gray-50 border-gray-300 text-gray-900 ${
                        missingFields.includes("nationality" as any) ? "border-red-500/50 ring-1 ring-red-500/30" : ""
                      }`}
                    >
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 max-h-60">
                      {COMMON_NATIONALITIES.map((nat) => (
                        <SelectItem key={nat} value={nat} className="text-gray-700 hover:bg-gray-100">
                          {nat}
                        </SelectItem>
                      ))}
                      <SelectItem value="__other__" className="text-gray-700 hover:bg-gray-100">
                        Not listed / Other
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {missingFields.includes("nationality" as any) && <p className="text-red-400 text-xs">Required</p>}
              </div>

              {/* Sex */}
              <div className="space-y-1">
                <Label className={`text-xs ${missingFields.includes("sex" as any) ? "text-red-400" : "text-gray-500"}`}>
                  Sex <span className="text-red-400">*</span>
                </Label>
                <div className="flex gap-2">
                  {(["M", "F", "X"] as const).map((option) => (
                    <Button
                      key={option}
                      variant={formData.sex === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, sex: option }))}
                      className={
                        formData.sex === option
                          ? "gradient-button text-white"
                          : `border-gray-300 text-gray-700 hover:bg-gray-100 ${
                              missingFields.includes("sex" as any) ? "border-red-500/50" : ""
                            }`
                      }
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {missingFields.includes("sex" as any) && <p className="text-red-400 text-xs">Required</p>}
              </div>

              {/* You requested: arrival defaults to created_at */}
              {renderRequiredInput("Arrival Date/Time", "arrival_date_time", "datetime-local")}

              {/* Departure Date removed from staff dashboard */}
              {/* {renderRequiredInput("Departure Date", "departure_date", "date")} */}

              {/* Property */}
              <div className="space-y-1">
                <Label
                  className={`text-xs ${missingFields.includes("property" as any) ? "text-red-400" : "text-gray-500"}`}
                >
                  Property <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={formData.property || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, property: e.target.value || null }))}
                  placeholder="Property name"
                  className={`bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 ${
                    missingFields.includes("property" as any) ? "border-red-500/50 ring-1 ring-red-500/30" : ""
                  }`}
                />
                {missingFields.includes("property" as any) && <p className="text-red-400 text-xs">Required</p>}
              </div>

              {renderRequiredInput("Room Number", "room_number", "text", "e.g. 101")}

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                  Notes / Exception Reason{" "}
                  {!ready && <span className="text-amber-400">(required if TM30 incomplete)</span>}
                </Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value || null }))}
                  placeholder="Add notes or explain why TM30 is incomplete..."
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 min-h-[80px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleCancel} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-button text-white">
            {saving ? "Saving..." : "Save TM30"}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleMarkReady}
                    disabled={!canMarkReady}
                    variant="outline"
                    className={
                      canMarkReady
                        ? "bg-green-600 hover:bg-green-700 text-white border-green-500"
                        : "border-gray-300 text-gray-400 cursor-not-allowed"
                    }
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark TM30 Ready
                  </Button>
                </span>
              </TooltipTrigger>
              {!canMarkReady && (
                <TooltipContent>
                  <p>{!ready ? `Missing: ${missingFields.join(", ")}` : "Please confirm extracted fields first"}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
};

export default TM30DetailsDrawer;
