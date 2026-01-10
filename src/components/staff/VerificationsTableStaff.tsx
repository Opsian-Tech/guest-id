// Convert SessionRow to ExtendedSessionRow using real backend data
const toExtendedSession = (session: SessionRow): ExtendedSessionRow => {
  // Backend nested structure (new)
  const textract = (session.extracted_info as any)?.textract || null;
  const textractRaw = textract?.raw || null;
  const mrzParsed = textract?.mrz_parsed || null;

  // Flat structure (old / previously working)
  const flat = (session.extracted_info as any) || {};

  const textractOk = (session.extracted_info as any)?.textract_ok ?? null;

  // Build "extracted_info" with fallbacks:
  // prefer FLAT if it exists, otherwise use NESTED raw
  const extracted_info = {
    first_name: flat.first_name || textractRaw?.first_name || null,
    middle_name: flat.middle_name || textractRaw?.middle_name || null,
    last_name: flat.last_name || textractRaw?.last_name || null,

    document_number: flat.document_number || textractRaw?.document_number || textract?.document_number || null,

    date_of_birth: flat.date_of_birth || textractRaw?.date_of_birth || textract?.dob || null,

    date_of_issue: flat.date_of_issue || textractRaw?.date_of_issue || null,
    expiration_date: flat.expiration_date || textractRaw?.expiration_date || null,
    id_type: flat.id_type || textractRaw?.id_type || null,

    mrz_code: flat.mrz_code || textractRaw?.mrz_code || null,

    // Keep original textract packet if present (drawer can read nested too)
    textract: textract || null,
    textract_ok: flat.textract_ok ?? (session.extracted_info as any)?.textract_ok ?? null,
    textract_error: flat.textract_error ?? (session.extracted_info as any)?.textract_error ?? null,

    // Optional: stash mrz_parsed at the top too (helps drawer and defaults)
    mrz_parsed: flat.mrz_parsed || mrzParsed || null,

    // Confidence scores (you can refine later)
    name_confidence: textractOk ? 0.95 : null,
    passport_confidence: textractOk ? 0.9 : null,
    document_confidence: textractOk ? 0.92 : null,
  };

  // TM30 defaults
  const tm30Info = (session as any)?.tm30_info || {};
  const arrivalFromCreatedAt = session.created_at
    ? new Date(session.created_at).toISOString().slice(0, 16) // "YYYY-MM-DDTHH:MM" for datetime-local
    : null;

  return {
    ...session,
    extracted_info,
    reservation: {
      check_in_time: null,
      check_out_date: null,
      property_name: "RoomQuest Hotel",
    },
    tm30: {
      nationality: tm30Info.nationality || mrzParsed?.nationality || null,

      sex: tm30Info.sex || mrzParsed?.sex || null,

      // IMPORTANT: use created_at as the default arrival date/time
      arrival_date_time: tm30Info.arrival_date_time || arrivalFromCreatedAt || null,

      // Keep for now; you can remove from UI later
      departure_date: tm30Info.departure_date || null,

      property: tm30Info.property || "RoomQuest Hotel",

      room_number: tm30Info.room_number || session.room_number || null,

      notes: tm30Info.notes || null,
    },
  };
};
