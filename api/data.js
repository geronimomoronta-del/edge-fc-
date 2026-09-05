export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY || "";

  if (req.query.action === "health") {
    return res.status(200).json({
      ok: true,
      live: Boolean(key),
      version: "0.3.0"
    });
  }

  if (!key) {
    return res.status(200).json({
      source: "demo",
      data: [],
      message: "Falta FOOTBALL_API_KEY"
    });
  }

  const action = req.query.action || "today";

  let url = "https://v3.football.api-sports.io/fixtures";

  if (action === "live") {
    url += "?live=all";
  } else {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    url += `?date=${date}&timezone=America/Argentina/Buenos_Aires`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": key
      }
    });

    const json = await response.json();

    return res.status(200).json({
      source: "api-football",
      data: json.response || []
    });

  } catch (error) {
    return res.status(500).json({
      error: "No se pudo consultar API-Football"
    });
  }
}
