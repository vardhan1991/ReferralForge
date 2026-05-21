# Keyword Extraction Prompt v1

Extract ATS terms from the job description as structured JSON.

Fields: hard_skills, soft_skills, domain_terms, seniority_terms, tools, certifications, responsibilities, qualifications, inferred_synonyms.

Rules:
- Deduplicate terms.
- Preserve exact JD wording when useful.
- Include confidence and evidence snippets.
