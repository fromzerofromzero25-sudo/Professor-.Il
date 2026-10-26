const MODEL = "gemini-2.5-flash";

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // استخدام الطريقة القياسية لقراءة المفتاح على Netlify
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing GEMINI_API_KEY environment variable" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const language = body.language === "en" ? "English" : "Arabic";
  
  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > 12000) {
    return Response.json({ error: "Message is too long (maximum 12000 characters)" }, { status: 413 });
  }

  const systemInstruction = `You are Professor AI, a helpful programming tutor. Reply in ${language}. Prioritize programming, code explanation, debugging, and learning. Be clear, accurate, and friendly. If writing code, use fenced code blocks and explain important parts. If unsure, say so. Never ask the user to reveal passwords, API keys, or other secrets.`;

  try {
    // تصحيح الرابط إلى v1beta بدلاً من vibeta
    const apiResponse = await fetch(
      `https://googleapis.com{MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
        })
      }
    );

    const result = await apiResponse.json().catch(() => ({}));
    
    if (!apiResponse.ok) {
      console.error("Gemini API error status:", apiResponse.status);
      return Response.json(
        { error: "Gemini request failed. Check API key, quota, and model availability." },
        { status: 502 }
      );
    }

    const reply = result.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return Response.json({ error: "The AI returned an empty response" }, { status: 502 });
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("Chat function failed:", error.message || "unknown error");
    return Response.json({ error: "AI service is temporarily unavailable" }, { status: 502 });
  }
};
