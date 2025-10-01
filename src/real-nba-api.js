// Real NBA API integration for up-to-date data
// This module provides actual NBA data from various sources

export class RealNBAData {
  constructor(env) {
    this.env = env;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get current NBA standings from ESPN API
  async getCurrentStandings() {
    try {
      const cacheKey = 'standings';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/standings');
      const data = await response.json();
      
      const standings = {
        eastern: data.children[0].standings.entries.map(team => ({
          rank: team.stats.find(s => s.type === 'rank')?.value || 0,
          team: team.team.displayName,
          record: `${team.stats.find(s => s.type === 'wins')?.value}-${team.stats.find(s => s.type === 'losses')?.value}`,
          gamesBehind: team.stats.find(s => s.type === 'gamesBehind')?.value || 0
        })),
        western: data.children[1].standings.entries.map(team => ({
          rank: team.stats.find(s => s.type === 'rank')?.value || 0,
          team: team.team.displayName,
          record: `${team.stats.find(s => s.type === 'wins')?.value}-${team.stats.find(s => s.type === 'losses')?.value}`,
          gamesBehind: team.stats.find(s => s.type === 'gamesBehind')?.value || 0
        }))
      };

      this.setCachedData(cacheKey, standings);
      return standings;
    } catch (error) {
      console.error('Error fetching standings:', error);
      return this.getFallbackStandings();
    }
  }

  // Get current NBA games (today's games)
  async getTodaysGames() {
    try {
      const cacheKey = 'todays-games';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`);
      const data = await response.json();
      
      const games = data.events.map(game => ({
        id: game.id,
        home: game.competitions[0].competitors.find(c => c.homeAway === 'home').team.displayName,
        away: game.competitions[0].competitors.find(c => c.homeAway === 'away').team.displayName,
        date: game.date,
        status: game.status.type.name,
        homeScore: game.competitions[0].competitors.find(c => c.homeAway === 'home').score,
        awayScore: game.competitions[0].competitors.find(c => c.homeAway === 'away').score,
        venue: game.competitions[0].venue?.fullName || 'TBD'
      }));

      this.setCachedData(cacheKey, games);
      return games;
    } catch (error) {
      console.error('Error fetching today\'s games:', error);
      return this.getFallbackGames();
    }
  }

  // Get upcoming games (next 7 days)
  async getUpcomingGames(days = 7) {
    try {
      const cacheKey = `upcoming-games-${days}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`);
      const data = await response.json();
      
      const upcomingGames = data.events
        .filter(game => {
          const gameDate = new Date(game.date);
          const now = new Date();
          const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
          return gameDate > now && gameDate <= futureDate;
        })
        .map(game => ({
          id: game.id,
          home: game.competitions[0].competitors.find(c => c.homeAway === 'home').team.displayName,
          away: game.competitions[0].competitors.find(c => c.homeAway === 'away').team.displayName,
          date: game.date,
          time: new Date(game.date).toLocaleTimeString(),
          venue: game.competitions[0].venue?.fullName || 'TBD',
          status: 'scheduled'
        }));

      this.setCachedData(cacheKey, upcomingGames);
      return upcomingGames;
    } catch (error) {
      console.error('Error fetching upcoming games:', error);
      return this.getFallbackUpcomingGames();
    }
  }

  // Get player statistics from NBA API
  async getPlayerStats(playerName) {
    try {
      const cacheKey = `player-${playerName.toLowerCase()}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Use NBA API to get player data
      const response = await fetch(`https://stats.nba.com/stats/playerprofilev2?PlayerID=${await this.getPlayerId(playerName)}`);
      const data = await response.json();
      
      if (data.resultSets && data.resultSets[0].rowSet.length > 0) {
        const playerData = data.resultSets[0].rowSet[0];
        const stats = {
          name: playerData[3], // Player name
          team: playerData[4], // Team
          position: playerData[5], // Position
          season: '2024-25',
          stats: {
            games: playerData[6] || 0,
            points: playerData[7] || 0,
            rebounds: playerData[8] || 0,
            assists: playerData[9] || 0,
            steals: playerData[10] || 0,
            blocks: playerData[11] || 0,
            fieldGoalPercentage: playerData[12] || 0,
            threePointPercentage: playerData[13] || 0,
            freeThrowPercentage: playerData[14] || 0,
            minutes: playerData[15] || 0
          }
        };

        this.setCachedData(cacheKey, stats);
        return stats;
      }
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return this.getFallbackPlayerStats(playerName);
    }
  }

  // Get team information
  async getTeamInfo(teamName) {
    try {
      const cacheKey = `team-${teamName.toLowerCase()}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams');
      const data = await response.json();
      
      const team = data.sports[0].leagues[0].teams.find(t => 
        t.team.displayName.toLowerCase().includes(teamName.toLowerCase())
      );

      if (team) {
        const teamInfo = {
          name: team.team.displayName,
          abbreviation: team.team.abbreviation,
          city: team.team.location,
          arena: team.team.venue?.fullName || 'TBD',
          founded: team.team.founded || 'Unknown',
          championships: team.team.championships?.length || 0
        };

        this.setCachedData(cacheKey, teamInfo);
        return teamInfo;
      }
    } catch (error) {
      console.error('Error fetching team info:', error);
      return this.getFallbackTeamInfo(teamName);
    }
  }

  // Get injury report
  async getInjuryReport() {
    try {
      const cacheKey = 'injury-report';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries');
      const data = await response.json();
      
      const injuries = data.injuries?.map(injury => ({
        player: injury.athlete?.displayName || 'Unknown',
        team: injury.team?.displayName || 'Unknown',
        injury: injury.injury || 'Unknown',
        status: injury.status || 'Unknown',
        expectedReturn: injury.expectedReturn || 'TBD'
      })) || [];

      this.setCachedData(cacheKey, injuries);
      return injuries;
    } catch (error) {
      console.error('Error fetching injury report:', error);
      return this.getFallbackInjuries();
    }
  }

  // Get NBA news and trade rumors
  async getNBANews() {
    try {
      const cacheKey = 'nba-news';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news');
      const data = await response.json();
      
      const news = data.articles.slice(0, 10).map(article => ({
        title: article.headline,
        summary: article.description,
        url: article.links.web.href,
        published: article.published,
        source: 'ESPN'
      }));

      this.setCachedData(cacheKey, news);
      return news;
    } catch (error) {
      console.error('Error fetching NBA news:', error);
      return this.getFallbackNews();
    }
  }

  // Helper methods for caching
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Simple fallback data methods (for when APIs fail)
  getFallbackStandings() {
    return { eastern: [], western: [] };
  }

  getFallbackGames() {
    return [];
  }

  getFallbackUpcomingGames() {
    return [];
  }

  getFallbackPlayerStats(playerName) {
    return {
      name: playerName,
      team: "Unknown",
      position: "Unknown",
      season: "2024-25",
      stats: {
        games: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
        fieldGoalPercentage: 0, threePointPercentage: 0, freeThrowPercentage: 0, minutes: 0
      }
    };
  }

  getFallbackTeamInfo(teamName) {
    return {
      name: teamName, abbreviation: "UNK", city: "Unknown", arena: "Unknown",
      founded: "Unknown", championships: 0
    };
  }

  getFallbackInjuries() {
    return [];
  }

  getFallbackNews() {
    return [];
  }

  // Helper method to get player ID (simplified)
  async getPlayerId(playerName) {
    // This would typically involve a player search API
    // For now, return a mock ID
    const playerMap = {
      'lebron james': '2544',
      'stephen curry': '201939',
      'giannis antetokounmpo': '203507',
      'luka doncic': '1629029',
      'jayson tatum': '1628369'
    };
    return playerMap[playerName.toLowerCase()] || '0';
  }
}
