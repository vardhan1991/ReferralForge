# Resume Analysis Prompt v1

Return JSON only. Compare the candidate profile to the normalized job JSON.

Rules:
- Never invent employers, tools, metrics, certifications, dates, titles, awards, publications, or team sizes.
- If evidence is missing, return `insufficient data`.
- Attach confidence to inferred skills, scoring, referral recommendations, and missing data claims.
- Prefer actionable recommendations that improve positioning without claiming new experience.

Output sections: score breakdown, missing keywords, missing skills, weak phrasing, quantified impact gaps, prioritized recommendations, recruiter psychology notes.
