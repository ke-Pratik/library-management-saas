package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// ── ENHANCEMENT #2: Response DTO for bulk fee generation ─────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateAllFeesResponse {

    private int month;
    private int year;
    private int totalActiveStudents;  // how many active students were processed
    private int generated;            // new fee records created this run
    private int skipped;              // already had a record for this month — untouched
    private int noConfig;             // active but fee was never locked (needs admin action)
    private List<Long> noConfigRegNos; // regNos of students with no fee config
    private String message;           // human-readable summary
}
// ── END ENHANCEMENT #2 ───────────────────────────────────────────────────────
