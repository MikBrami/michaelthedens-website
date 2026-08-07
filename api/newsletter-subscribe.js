const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "Methode nicht erlaubt." });
  }

  const email = String(request.body?.email || "").trim().toLowerCase();
  const consent = request.body?.consent === true;
  if (!EMAIL_PATTERN.test(email) || !consent) {
    return response.status(400).json({ message: "Bitte E-Mail-Adresse und Einwilligung prüfen." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  const templateId = Number(process.env.BREVO_DOI_TEMPLATE_ID);
  const redirectionUrl = process.env.BREVO_REDIRECT_URL || "https://www.michaelthedens.de/?newsletter=confirmed#newsletter";

  if (!apiKey || !Number.isInteger(listId) || !Number.isInteger(templateId)) {
    return response.status(503).json({ message: "Der Newsletter startet in Kürze. Die Anmeldung ist noch nicht freigeschaltet." });
  }

  try {
    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts/doubleOptinConfirmation", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({ email, includeListIds: [listId], templateId, redirectionUrl })
    });

    if (!brevoResponse.ok) {
      const errorBody = await brevoResponse.text();
      console.error("Brevo DOI failed:", brevoResponse.status, errorBody.slice(0, 500));
      return response.status(502).json({ message: "Die Anmeldung konnte nicht abgeschlossen werden. Bitte später erneut versuchen." });
    }

    return response.status(201).json({ ok: true });
  } catch (error) {
    console.error("Newsletter endpoint failed:", error);
    return response.status(502).json({ message: "Die Anmeldung konnte nicht abgeschlossen werden. Bitte später erneut versuchen." });
  }
}
