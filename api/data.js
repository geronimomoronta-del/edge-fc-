export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY || "";

  if (req.query.action === "health") {
    return res.status(200).json({
      ok: true,
      live: Boolean(key),
      version: "1.0.0"
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

  if (action === "value") {
    if (!fixture) {
      return res.status(400).json({
        ok: false,
        error: "Falta fixture ID"
      });
    }

    try {
      const headers = {
        "x-apisports-key": key
      };

      const [predictionResponse, oddsResponse] = await Promise.all([
        fetch(
          "https://v3.football.api-sports.io/predictions?fixture=" +
          encodeURIComponent(fixture),
          { headers }
        ),
        fetch(
          "https://v3.football.api-sports.io/odds?fixture=" +
          encodeURIComponent(fixture),
          { headers }
        )
      ]);

      const predictionJson = await predictionResponse.json();
      const oddsJson = await oddsResponse.json();

      const prediction = predictionJson.response?.[0];
      const oddsData = oddsJson.response?.[0];

      if (!prediction) {
        return res.status(200).json({
          ok: false,
          error: "No hay predicción disponible para este fixture"
        });
      }

      if (!oddsData) {
        return res.status(200).json({
          ok: false,
          error: "No hay cuotas disponibles para este fixture"
        });
      }

      const bookmaker = (oddsData.bookmakers || []).find(b =>
        b.bets?.some(bet => bet.name === "Match Winner")
      );

      if (!bookmaker) {
        return res.status(200).json({
          ok: false,
          error: "No se encontró mercado Match Winner"
        });
      }

      const market = bookmaker.bets.find(
        bet => bet.name === "Match Winner"
      );

      const homeOdd = Number(
        market.values.find(v => v.value === "Home")?.odd
      );

      const drawOdd = Number(
        market.values.find(v => v.value === "Draw")?.odd
      );

      const awayOdd = Number(
        market.values.find(v => v.value === "Away")?.odd
      );

      if (!homeOdd || !drawOdd || !awayOdd) {
        return res.status(200).json({
          ok: false,
          error: "Cuotas 1X2 incompletas"
        });
      }

      const rawHome = 1 / homeOdd;
      const rawDraw = 1 / drawOdd;
      const rawAway = 1 / awayOdd;

      const totalRaw =
        rawHome + rawDraw + rawAway;

      const marketProb = {
        home: rawHome / totalRaw,
        draw: rawDraw / totalRaw,
        away: rawAway / totalRaw
      };

      const percent =
        prediction.predictions?.percent || {};

      const modelProb = {
        home:
          parseFloat(percent.home || "0") / 100,
        draw:
          parseFloat(percent.draw || "0") / 100,
        away:
          parseFloat(percent.away || "0") / 100
      };

      const calculate = (
        selection,
        odd,
        model,
        market
      ) => {
        const fairOdd =
          model > 0 ? 1 / model : null;

        const edge =
          model - market;

        const ev =
          model * odd - 1;

        return {
          selection,
          odd,
          market_probability:
            +(market * 100).toFixed(2),
          model_probability:
            +(model * 100).toFixed(2),
          fair_odd:
            fairOdd
            ? +fairOdd.toFixed(2)
            : null,
          edge:
            +(edge * 100).toFixed(2),
          ev:
            +(ev * 100).toFixed(2),
          value:
  ev >= 0.05 && edge >= 0.03,

confidence:
  ev >= 0.15 && edge >= 0.08
    ? "HIGH"
    : ev >= 0.05 && edge >= 0.03
    ? "MEDIUM"
    : "LOW"
        };
      };

      const opportunities = [
        calculate(
          "HOME",
          homeOdd,
          modelProb.home,
          marketProb.home
        ),
        calculate(
          "DRAW",
          drawOdd,
          modelProb.draw,
          marketProb.draw
        ),
        calculate(
          "AWAY",
          awayOdd,
          modelProb.away,
          marketProb.away
        )
      ].sort((a, b) => b.ev - a.ev);

      return res.status(200).json({
        ok: true,
        source: "edge-fc",
        fixture,
        bookmaker: bookmaker.name,
        market: "1X2",
        prediction_advice:
          prediction.predictions?.advice || null,
        opportunities
      });

    } catch (error) {
      return res.status(500).json({
        ok: false,
        error:
          "No se pudo calcular el Value Finder"
      });
    }
  }

  let url = "";

  if (action === "live") {
    url =
      "https://v3.football.api-sports.io/fixtures?live=all";
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

  else {
    const date =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "America/Argentina/Buenos_Aires",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }
      ).format(new Date());

    url =
      "https://v3.football.api-sports.io/fixtures?date=" +
      date +
      "&timezone=America/Argentina/Buenos_Aires";
  }

  try {
    const response = await fetch(
      url,
      {
        headers: {
          "x-apisports-key": key
        }
      }
    );

    const json =
      await response.json();

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
      error:
        "No se pudo consultar API-Football"
    });
  }
}
