export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY || "";

  if (req.query.action === "health") {
    return res.status(200).json({
      ok: true,
      live: Boolean(key),
      version: "0.6.1"
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
  const team = req.query.team;

  let url = "";

  if (action === "live") {
    url = "https://v3.football.api-sports.io/fixtures?live=all";
  }

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

  else if (action === "prediction") {
  if (!fixture) {
    return res.status(400).json({
      ok: false,
      error: "Falta fixture ID"
    });
  }

  url =
    "https://v3.football.api-sports.io/predictions?fixture=" +
    encodeURIComponent(fixture);
}
  else if (action === "teamform") {
    if (!team) {
      return res.status(400).json({
        ok: false,
        error: "Falta team ID"
      });
    }

    const today = new Date();
    const fromDate = new Date();

    fromDate.setDate(today.getDate() - 120);

    const to = today.toISOString().slice(0, 10);
    const from = fromDate.toISOString().slice(0, 10);

    url =
      "https://v3.football.api-sports.io/fixtures?team=" +
      encodeURIComponent(team) +
      "&season=2026" +
      "&from=" +
      from +
      "&to=" +
      to +
      "&status=FT";
  }

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

    let data = json.response || [];

    if (action === "teamform") {
      data = data
        .sort((a, b) => {
          return new Date(b.fixture.date) - new Date(a.fixture.date);
        })
        .slice(0, 10);
    }

    return res.status(200).json({
      ok: true,
      source: "api-football",
      action,
      fixture: fixture || null,
      team: team || null,
      data,
      errors: json.errors || []
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "No se pudo consultar API-Football"
    });
  }
}
