

## Add Mock Data for Staff Dashboard

This plan adds sample mock data for both **Guest** and **Visitor** flows to the Staff Dashboard so you can see how the UI looks with realistic data without needing a live backend connection.

---

### What Will Be Added

**Mock Guest Sessions (5 examples):**
- Verified guests with high scores
- Failed verification attempts
- Pending verifications
- Multi-guest booking examples (2 guests on one reservation)
- Various extracted document data (passport info, nationality, etc.)

**Mock Visitor Sessions (5 examples):**
- Approved visitors with access codes
- Visitors with different reasons (delivery, meeting, maintenance)
- Various phone numbers and names

---

### Implementation

**Step 1: Create Mock Data File**

Create a new file `src/lib/mockData.ts` containing:
- 5 sample guest sessions with realistic Thai hotel check-in data
- 5 sample visitor sessions with access codes
- Mock admin stats

**Step 2: Update StaffDashboard.tsx**

Modify the `loadData` function to:
- Use mock data as a fallback when the API fails (or optionally always in dev mode)
- This ensures the dashboard works even when the backend is unavailable

---

### Sample Mock Data Preview

| Type | Name | Room/Reason | Status | Score |
|------|------|-------------|--------|-------|
| Guest | John Smith | 401 | Verified | 95% |
| Guest | Maria Garcia | 512 | Verified | 88% |
| Guest | Wei Chen | 203 | Failed | 45% |
| Guest | Anna Mueller | 715 | Pending | - |
| Guest | James Wilson + Sarah Wilson | 608 | Multi-guest (2/2) | 92% |
| Visitor | David Brown | Package Delivery | Approved | Code: 847291 |
| Visitor | Lisa Thompson | Business Meeting | Approved | Code: 293847 |
| Visitor | Michael Lee | Maintenance | Approved | Code: 582914 |
| Visitor | Emma Davis | Property Viewing | Approved | Code: 719382 |
| Visitor | Robert Kim | Food Delivery | Approved | Code: 461928 |

---

### Technical Details

```text
src/lib/mockData.ts
├── MOCK_GUEST_SESSIONS: SessionRow[]
│   └── 5 guest records with:
│       - flow_type: "guest"
│       - extracted_info with passport/ID details
│       - tm30_info with nationality, arrival time
│       - verification scores
│       - Multi-guest example (guest_verifications array)
│
├── MOCK_VISITOR_SESSIONS: SessionRow[]
│   └── 5 visitor records with:
│       - flow_type: "visitor"
│       - visitor_first_name, visitor_last_name
│       - visitor_phone, visitor_reason
│       - visitor_access_code
│
└── MOCK_ADMIN_STATS: AdminStats
    └── Pre-calculated totals matching mock sessions

src/pages/StaffDashboard.tsx
└── loadData() updated to use mock data on API failure
```

---

### Result

After implementation:
- The Staff Dashboard will display realistic sample data
- You can test the Guest/Visitor filter toggle
- TM30 status badges will show on guest records
- Visitor access codes will be visible
- Stats cards will show accurate counts based on mock data

