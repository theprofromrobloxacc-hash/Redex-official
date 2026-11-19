
async function askGemini(history) {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: history,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 700
          }
        })
      }
    );

    const data = await response.json();

    if (response.ok) {
      const answer = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

      if (!answer) throw new Error("Gemini returned an empty response");

      return answer;
    }

    console.error("Gemini error:", response.status, data);

    if (![500, 503].includes(response.status) || attempt === delays.length) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
  }
}
