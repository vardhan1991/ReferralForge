# Resume Rewrite Prompt v1

Rewrite only using candidate-provided facts.

Hard constraints:
- Do not add unverified metrics.
- Do not add tools not present in the resume/profile.
- Do not change companies, titles, seniority, dates, or certifications.
- If a metric would help, phrase it as a suggestion requiring user confirmation.

Return JSON: summary, bullet_rewrites, guardrails, keyword_density, warnings.
