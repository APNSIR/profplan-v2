const GEMINI_MODEL = "gemini-3.8-flash";
const MAX_SYLLABUS_CHARS = 30000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GenerateRequest = {
  className?: string;
  subjectName?: string;
  subjectCode?: string;
  syllabusText?: string;
};

type GeneratedTopic = {
  name: string;
  plannedClasses: number;
};

type GeneratedUnit = {
  unitNumber: number;
  name: string;
  topics: GeneratedTopic[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isValidGeneratedPlan(value: unknown): value is {
  units: GeneratedUnit[];
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as { units?: unknown };

  if (!Array.isArray(result.units) || result.units.length === 0) {
    return false;
  }

  return result.units.every((unit) => {
    if (!unit || typeof unit !== "object") {
      return false;
    }

    const u = unit as {
      unitNumber?: unknown;
      name?: unknown;
      topics?: unknown;
    };

    if (
      typeof u.unitNumber !== "number" ||
      !Number.isInteger(u.unitNumber) ||
      u.unitNumber < 1
    ) {
      return false;
    }

    if (typeof u.name !== "string" || !u.name.trim()) {
      return false;
    }

    if (!Array.isArray(u.topics) || u.topics.length === 0) {
      return false;
    }

    return u.topics.every((topic) => {
      if (!topic || typeof topic !== "object") {
        return false;
      }

      const t = topic as {
        name?: unknown;
        plannedClasses?: unknown;
      };

      return (
        typeof t.name === "string" &&
        t.name.trim().length > 0 &&
        typeof t.plannedClasses === "number" &&
        Number.isInteger(t.plannedClasses) &&
        t.plannedClasses > 0
      );
    });
  });
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return jsonResponse(
        { error: "Only POST requests are allowed." },
        405,
      );
    }

    try {
      const body = (await req.json()) as GenerateRequest;

      const className = body.className?.trim() || "";
      const subjectName = body.subjectName?.trim() || "";
      const subjectCode = body.subjectCode?.trim() || "";
      const syllabusText = body.syllabusText?.trim() || "";

      if (!subjectName) {
        return jsonResponse(
          { error: "Subject name is required." },
          400,
        );
      }

      if (!syllabusText) {
        return jsonResponse(
          { error: "Syllabus text is required." },
          400,
        );
      }

      if (syllabusText.length > MAX_SYLLABUS_CHARS) {
        return jsonResponse(
          {
            error:
              "The syllabus is too large. Please provide a shorter syllabus text.",
          },
          413,
        );
      }

      const apiKey = Deno.env.get("GEMINI_API_KEY");

      if (!apiKey) {
        console.error("GEMINI_API_KEY is not configured.");

        return jsonResponse(
          { error: "AI service is not configured." },
          500,
        );
      }

      const systemInstruction = `
You are the academic intelligence engine of ProfPlan, a digital
E-Lesson Plan and Progress Register created for teachers.

Your task is to transform an authentic syllabus supplied by a teacher
into a realistic, academically coherent and classroom-usable teaching
plan.

ACADEMIC PRINCIPLES

1. Respect the syllabus supplied by the teacher.

2. Do not invent unrelated units, authors, theories, chapters, texts,
   concepts or topics merely to make the plan appear complete.

3. Preserve the academic meaning and hierarchy of the source syllabus.

4. Identify logical units, modules or sections from the supplied syllabus.

5. Divide substantial content into meaningful, classroom-sized topics.

6. Keep the natural academic sequence of the source syllabus.

7. Estimate planned classes according to the complexity and teaching
   requirements of each topic.

8. Do not automatically assign the same number of classes to every topic.

9. A substantial literary, theoretical, linguistic or interdisciplinary
   topic may reasonably require more classes than a smaller topic.

10. Keep topic names concise, precise and teacher-friendly.

11. Do not create revision, examination or assessment topics unless the
    supplied syllabus or course context reasonably supports them.

12. Never claim to have information that was not supplied.

13. Do not manufacture missing syllabus details.

14. The output must be useful to a real teacher preparing an actual
    teaching schedule.

15. Return only the requested JSON structure.
`;

      const userPrompt = `
PROFPLAN ACADEMIC CONTEXT

Class / Semester:
${className || "Not specified"}

Subject:
${subjectName}

Paper Code:
${subjectCode || "Not specified"}

AUTHENTIC SYLLABUS PROVIDED BY THE TEACHER
------------------------------------------
${syllabusText}
------------------------------------------

TASK

Analyse the supplied syllabus carefully.

Identify its actual academic units, modules or sections.

Then break those units into realistic teachable topics suitable for
classroom planning.

Preserve the original academic sequence.

Do not replace the syllabus with a generic syllabus for the subject.

Return exactly this JSON structure:

{
  "units": [
    {
      "unitNumber": 1,
      "name": "Unit name",
      "topics": [
        {
          "name": "Topic name",
          "plannedClasses": 3
        }
      ]
    }
  ]
}

OUTPUT REQUIREMENTS

- unitNumber must be sequential starting from 1.
- Every unit must contain at least one topic.
- Every topic must have a concise teacher-friendly name.
- plannedClasses must be a positive whole number.
- Assign class counts according to actual content complexity.
- Use only information reasonably supported by the supplied syllabus.
- Preserve the syllabus structure wherever it is identifiable.
- Do not add explanations.
- Do not use Markdown.
- Return valid JSON only.
`;

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: systemInstruction,
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: userPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();

        console.error(
          "Gemini API error:",
          geminiResponse.status,
          errorText,
        );

        return jsonResponse(
          {
            error:
              "The AI service could not generate the syllabus plan.",
          },
          502,
        );
      }

      const geminiData = await geminiResponse.json();

      const generatedText =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText || typeof generatedText !== "string") {
        console.error("Gemini returned no generated text.");

        return jsonResponse(
          { error: "The AI returned an empty response." },
          502,
        );
      }

      let parsedResult: unknown;

      try {
        parsedResult = JSON.parse(generatedText);
      } catch {
        console.error(
          "Gemini returned invalid JSON:",
          generatedText,
        );

        return jsonResponse(
          {
            error:
              "The AI returned an invalid syllabus structure.",
          },
          502,
        );
      }

      if (!isValidGeneratedPlan(parsedResult)) {
        console.error(
          "Gemini returned an invalid syllabus structure:",
          parsedResult,
        );

        return jsonResponse(
          {
            error:
              "The AI returned an invalid syllabus structure.",
          },
          502,
        );
      }

      return jsonResponse({
        success: true,
        units: parsedResult.units,
      });
    } catch (error) {
      console.error(
        "ProfPlan AI gateway error:",
        error,
      );

      return jsonResponse(
        {
          error: "Unexpected AI service error.",
        },
        500,
      );
    }
  },
};