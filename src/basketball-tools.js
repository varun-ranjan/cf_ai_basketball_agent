// Basketball-specific tools and utilities for the NBA Agent
import { NBAData } from "./nba-api.js";

export class BasketballTools {
  constructor(env) {
    this.env = env;
    this.nbaData = new NBAData(env);
  }

  // Player statistics and analysis tools
  async getPlayerStats(playerName) {
    try {
      const stats = await this.nbaData.getPlayerStats(playerName);
      if (stats && stats.name) {
        return stats;
      }
    } catch (error) {
      console.error("Error fetching player stats:", error);
    }

    // Simple fallback if API fails
    return {
      name: playerName,
      team: "Unknown",
      position: "Unknown",
      season: "2024-25",
      stats: {
        games: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fieldGoalPercentage: 0,
        threePointPercentage: 0,
        freeThrowPercentage: 0,
        minutes: 0,
      },
    };
  }

  // Team information and standings
  async getTeamInfo(teamName) {
    try {
      const teamInfo = await this.nbaData.getTeamInfo(teamName);
      if (teamInfo && teamInfo.name) {
        return teamInfo;
      }
    } catch (error) {
      console.error("Error fetching team info:", error);
    }

    // Simple fallback if API fails
    return {
      name: teamName,
      abbreviation: "UNK",
      city: "Unknown",
      arena: "Unknown",
      founded: "Unknown",
      championships: 0,
    };
  }

  // Game schedules and results
  async getUpcomingGames(team = null, days = 7) {
    try {
      const games = await this.nbaData.getUpcomingGames(days);
      if (games && games.length > 0) {
        if (team) {
          return games.filter(
            (game) =>
              game.home.toLowerCase().includes(team.toLowerCase()) ||
              game.away.toLowerCase().includes(team.toLowerCase())
          );
        }
        return games;
      }
    } catch (error) {
      console.error("Error fetching upcoming games:", error);
    }

    // Simple fallback if API fails
    return [];
  }

  // League standings
  async getStandings(conference = null) {
    try {
      const standings = await this.nbaData.getCurrentStandings();
      if (standings && (standings.eastern || standings.western)) {
        if (conference === "eastern") return standings.eastern;
        if (conference === "western") return standings.western;
        return standings;
      }
    } catch (error) {
      console.error("Error fetching standings:", error);
    }

    // Simple fallback if API fails
    return {
      eastern: [],
      western: [],
    };
  }

  // Injury reports
  async getInjuryReport() {
    try {
      const injuries = await this.nbaData.getInjuryReport();
      if (injuries && injuries.length > 0) {
        return {
          date: new Date().toISOString().split("T")[0],
          injuries: injuries,
        };
      }
    } catch (error) {
      console.error("Error fetching injury report:", error);
    }

    // Simple fallback if API fails
    return {
      date: new Date().toISOString().split("T")[0],
      injuries: [],
    };
  }

  // Get today's games with live data
  async getTodaysGames() {
    try {
      const games = await this.nbaData.getTodaysGames();
      if (games && games.length > 0) {
        return games;
      }
    } catch (error) {
      console.error("Error fetching today's games:", error);
    }

    // Simple fallback if API fails
    return [];
  }

  // Get NBA news and trade rumors
  async getNBANews() {
    try {
      const news = await this.nbaData.getNBANews();
      if (news && news.length > 0) {
        return news;
      }
    } catch (error) {
      console.error("Error fetching NBA news:", error);
    }

    // Simple fallback if API fails
    return [];
  }

  // Get live game scores
  async getLiveScores() {
    try {
      const games = await this.nbaData.getTodaysGames();
      if (games && games.length > 0) {
        return games.filter(
          (game) => game.status === "in-progress" || game.status === "final"
        );
      }
    } catch (error) {
      console.error("Error fetching live scores:", error);
    }

    // Simple fallback if API fails
    return [];
  }
}
