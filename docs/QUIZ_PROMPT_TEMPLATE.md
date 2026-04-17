# Quiz Generation Prompt Template

Copy everything between the `---` lines below, paste it into any LLM (Microsoft Copilot, ChatGPT, Claude, Gemini, etc.), and replace `[PASTE MATERIAL HERE]` with your course notes, transcript, or any learning material.

The LLM will output JSON that you can paste directly into **Create quiz → Paste JSON** on the platform.

---

You are helping me create a quiz from course materials I'll provide.

Output **ONLY valid JSON** matching this exact schema. No prose, no explanations, no markdown fences — just the raw JSON object.

## Schema

```json
{
  "title": "string (3–120 chars)",
  "description": "string (0–500 chars)",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "questions": [
    {
      "type": "single_choice" | "multiple_choice" | "true_false" | "short_text",
      "question": "string (required)",
      "options": ["..."],
      "correctAnswer": <index|bool|string>,
      "correctAnswers": [<indices>],
      "explanation": "string (optional)"
    }
  ]
}
```

## Per-type rules

- **single_choice**: include `options` (2–6 strings) and `correctAnswer` as the zero-based index of the correct option. Do NOT include `correctAnswers`.
- **multiple_choice**: include `options` and `correctAnswers` as an array of zero-based indices (at least 1). Do NOT include `correctAnswer`.
- **true_false**: omit `options`. `correctAnswer` must be the boolean `true` or `false`.
- **short_text**: omit `options`. `correctAnswer` must be a short string (matching is case-insensitive, whitespace-normalized).

## Content rules

- 5–20 questions per quiz.
- Mix question types when it fits the material.
- Keep questions unambiguous. Avoid trick questions.
- `explanation` is optional but encouraged — takers see it after submitting.
- Questions should be answerable from the material provided.

## Source material

---
[PASTE MATERIAL HERE]
---

Now produce the JSON.

---

## After the LLM responds

1. Copy the JSON it outputs.
2. Go to the platform → **Create quiz** → **Paste JSON** tab.
3. Paste. If the platform flags errors, show them to the LLM and ask it to fix.
4. Review, then click **Save as draft**.
5. Edit the draft if needed. When ready, click **Publish**.

Once published, the quiz cannot be edited (keeps scores fair). If you need to change it, use **Unpublish & Edit** — this archives the current version with its scores preserved and opens a fresh draft.
