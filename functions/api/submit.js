export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  const { name, email, company, volume, po } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!company || typeof company !== "string" || company.trim().length === 0) {
    return Response.json({ error: "Company is required" }, { status: 400 });
  }

  const validVolumes = ["Fewer than 10", "10 to 30", "30 to 100", "More than 100"];
  const vol = volume || "10 to 30";
  if (!validVolumes.includes(vol)) {
    return Response.json({ error: "Invalid volume selection" }, { status: 400 });
  }

  const poText = (po && typeof po === "string") ? po.trim() : null;

  // Store in D1
  try {
    await env.DB.prepare(
      "INSERT INTO submissions (name, email, company, volume, po) VALUES (?, ?, ?, ?, ?)"
    ).bind(name.trim(), email.trim(), company.trim(), vol, poText).run();
  } catch (err) {
    console.error("D1 insert failed:", err);
    return Response.json({ error: "Failed to save submission" }, { status: 500 });
  }

  // Send email notification via Resend
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "RekeyPilot <onboarding@resend.dev>",
          to: [env.NOTIFY_EMAIL],
          subject: `New sample PO from ${name.trim()} at ${company.trim()}`,
          text: [
            `Name: ${name.trim()}`,
            `Email: ${email.trim()}`,
            `Company: ${company.trim()}`,
            `POs/week: ${vol}`,
            ``,
            `PO content:`,
            poText || "(none)",
          ].join("\n"),
        }),
      });
    } catch (err) {
      // Log but don't fail the request — submission is already saved
      console.error("Resend email failed:", err);
    }
  }

  return Response.json({ success: true }, { status: 201 });
}
