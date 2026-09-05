export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY || "";

  if (req.query.action === "health") {
    return res.status(200).json({
      ok: true,
      live: Boolean(key),
      version: "0.5.0"
    });
  }

  if (!key) {
    return res.status(200).json({
      ok: false,
      data: [],
      message: "Falta FOOTBALL_API_KEY"
    });
  }

  const action = req.query.action || "today";
  const fixture = req.query.fixture;

  let url = "";

  // PARTIDOS EN VIVO
  if (action === "live") {
    url = "https://v3.football.api-sports.io/fixtures?live=all";
  }

  // CUOTAS
  else if (action === "odds") {
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

  // ESTADÍSTICAS DEL PARTIDO
  else if (action === "stats") {
    if (!fixture) {
      return res.status(400).json({
        ok: false,
        error: "Falta fixture ID"
      });
    }

    url =
      "https://v3.football.api-sports.io/fixtures/statistics?fixture=" +
      encodeURIComponent(fixture);
  }

  // DATOS COMPLETOS DEL FIXTURE
  else if (action === "fixture") {
    if (!fixture) {
      return res.status(400).json({
        ok: false,
        error: "Falta fixture ID"
      });
    }

    url =
      "https://v3.football.api-sports.io/fixtures?id=" +
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

    url =
      "https://v3.football.api-sports.io/fixtures?date=" +
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
      fixture: fixture || null,
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
