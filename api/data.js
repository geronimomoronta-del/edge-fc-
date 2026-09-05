export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY || "";

  // Comprobación rápida
  if (req.query.action === "health") {
    return res.status(200).json({
      ok: true,
      live: Boolean(key),
      version: "0.4.0"
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

  // PARTIDOS EN VIVO
  if (action === "live") {
    url += "?live=all";
  }

  // CUOTAS DE UN PARTIDO
  else if (action === "odds") {
    const fixture = req.query.fixture;

    if (!fixture) {
      return res.status(400).json({
        ok: false,
        error: "Falta fixture ID"
      });
    }

    url =
      "https://v3.football.api-sports.io/odds?fixture=" +
      encodeURIComponent(fixture);
  }

  // PARTIDOS DEL DÍA
  else {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    url +=
      "?date=" +
      date +
      "&timezone=America/Argentina/Buenos_Aires";
  }

  try {
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": key
      }
    });

    const json = await response.json();

    return res.status(200).json({
      ok: true,
      source: "api-football",
      action,
      data: json.response || [],
      errors: json.errors || []
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "No se pudo consultar API-Football"
    });
  }
}
