import random
import itertools
import argparse
from collections import defaultdict

class TeamScheduler:
    def __init__(self, num_teams=5, min_matches=5, teams_per_alliance=2):
        self.num_teams = num_teams
        self.min_matches = min_matches
        self.teams_per_alliance = teams_per_alliance
        self.teams_per_match = teams_per_alliance * 2  # 2 alliances
        self.teams = {}
        self.matches = []
        self.team_match_counts = defaultdict(int)
        self.team_partners = defaultdict(set)
        self.team_opponents = defaultdict(set)
        
    def generate_team_names(self):
        """Generate random creative team names"""
        adjectives = ['Thunder', 'Lightning', 'Fire', 'Ice', 'Storm', 'Shadow', 
                     'Golden', 'Silver', 'Bronze', 'Crystal', 'Electric', 'Cosmic',
                     'Mystic', 'Dragon', 'Phoenix', 'Tiger', 'Lion', 'Eagle',
                     'Wolf', 'Bear', 'Cobra', 'Panther', 'Falcon', 'Hawk']
        
        nouns = ['Hawks', 'Eagles', 'Lions', 'Tigers', 'Bears', 'Wolves', 
                'Dragons', 'Phoenixes', 'Panthers', 'Cobras', 'Falcons',
                'Warriors', 'Champions', 'Legends', 'Masters', 'Titans',
                'Giants', 'Knights', 'Samurai', 'Ninjas', 'Gladiators',
                'Vikings', 'Spartans', 'Pirates', 'Cowboys', 'Outlaws']
        
        selected_names = []
        while len(selected_names) < self.num_teams:
            name = f"{random.choice(adjectives)} {random.choice(nouns)}"
            if name not in selected_names:
                selected_names.append(name)
        
        for i, name in enumerate(selected_names):
            self.teams[i] = name
            
    def get_teams_with_fewest_matches(self, available_teams):
        """Get teams that have played the fewest matches"""
        min_count = min(self.team_match_counts[team] for team in available_teams)
        return [team for team in available_teams if self.team_match_counts[team] == min_count]
    
    def select_teams_for_match(self):
        """Select teams for the next match, balancing match counts"""
        available_teams = list(self.teams.keys())
        
        if len(available_teams) < self.teams_per_match:
            return None
            
        # Prioritize teams with fewer matches
        teams_with_min_matches = self.get_teams_with_fewest_matches(available_teams)
        
        if len(teams_with_min_matches) >= self.teams_per_match:
            return random.sample(teams_with_min_matches, self.teams_per_match)
        else:
            # Take all teams with minimum matches, then add others
            selected = teams_with_min_matches[:]
            remaining = [team for team in available_teams if team not in selected]
            needed = self.teams_per_match - len(selected)
            selected.extend(random.sample(remaining, min(needed, len(remaining))))
            return selected
    
    def form_alliances(self, teams):
        """Form alliances from selected teams"""
        # Generate all possible ways to split teams into two alliances
        all_possible_splits = list(itertools.combinations(teams, self.teams_per_alliance))
        
        # Score each split based on partnership diversity
        scored_splits = []
        for alliance1_combo in all_possible_splits:
            alliance1 = list(alliance1_combo)
            alliance2 = [t for t in teams if t not in alliance1]
            
            # Calculate partnership score (lower is better)
            partnership_score = 0
            for i, team1 in enumerate(alliance1):
                for team2 in alliance1[i+1:]:
                    partnership_score += len(self.team_partners[team1].intersection({team2}))
            
            for i, team1 in enumerate(alliance2):
                for team2 in alliance2[i+1:]:
                    partnership_score += len(self.team_partners[team1].intersection({team2}))
            
            scored_splits.append((partnership_score, alliance1, alliance2))
        
        # Sort by score and pick the best split
        scored_splits.sort()
        return scored_splits[0][1], scored_splits[0][2]
    
    def schedule_matches(self):
        """Main scheduling algorithm"""
        self.generate_team_names()
        
        match_number = 1
        max_iterations = 100  # Prevent infinite loops
        iterations = 0
        
        while True:
            # Check if all teams have minimum matches
            all_teams_met_min = all(self.team_match_counts[team] >= self.min_matches 
                                   for team in self.teams.keys())
            
            if all_teams_met_min:
                print(f"✓ All teams have reached minimum {self.min_matches} matches")
                break
            
            # Select teams for next match
            selected_teams = self.select_teams_for_match()
            if selected_teams is None:
                print("⚠ Cannot form match: Not enough available teams")
                break
            
            # Form alliances
            alliance1, alliance2 = self.form_alliances(selected_teams)
            
            # Record match
            match = {
                'match_number': match_number,
                'alliance1': alliance1,
                'alliance2': alliance2,
                'sitting_out': [team for team in self.teams.keys() if team not in selected_teams]
            }
            self.matches.append(match)
            
            # Update team statistics
            for team in selected_teams:
                self.team_match_counts[team] += 1
            
            # Update partners and opponents
            for i, team1 in enumerate(alliance1):
                for team2 in alliance1[i+1:]:
                    self.team_partners[team1].add(team2)
                    self.team_partners[team2].add(team1)
                    
                for opponent in alliance2:
                    self.team_opponents[team1].add(opponent)
                    self.team_opponents[opponent].add(team1)
            
            # Also update partners within alliance2
            for i, team1 in enumerate(alliance2):
                for team2 in alliance2[i+1:]:
                    self.team_partners[team1].add(team2)
                    self.team_partners[team2].add(team1)
            
            match_number += 1
            iterations += 1
            
            if iterations >= max_iterations:
                print("⚠ Maximum iterations reached")
                break
    
    def print_results(self):
        """Print the match schedule and statistics"""
        print("\n" + "="*60)
        print("TOURNAMENT SCHEDULE")
        print("="*60)
        
        for match in self.matches:
            print(f"\nMatch {match['match_number']}:")
            alliance1_names = [self.teams[team] for team in match['alliance1']]
            alliance2_names = [self.teams[team] for team in match['alliance2']]
            print(f"  Alliance 1 ({self.teams_per_alliance} teams): {' & '.join(alliance1_names)}")
            print(f"  Alliance 2 ({self.teams_per_alliance} teams): {' & '.join(alliance2_names)}")
            if match['sitting_out']:
                sitting_out_names = [self.teams[team] for team in match['sitting_out']]
                print(f"  Sitting out ({len(match['sitting_out'])} teams): {', '.join(sitting_out_names)}")
        
        print("\n" + "="*60)
        print("TEAM STATISTICS")
        print("="*60)
        
        for team_id, team_name in self.teams.items():
            matches_played = self.team_match_counts[team_id]
            partners = [self.teams[p] for p in self.team_partners[team_id]]
            opponents = [self.teams[o] for o in self.team_opponents[team_id]]
            
            print(f"\n{team_name}:")
            print(f"  Matches played: {matches_played}")
            print(f"  Partners: {', '.join(partners) if partners else 'None'}")
            print(f"  Opponents: {', '.join(opponents) if opponents else 'None'}")
        
        print("\n" + "="*60)
        print("CONSTRAINT VERIFICATION")
        print("="*60)
        
        all_constraints_met = True
        for team_id, team_name in self.teams.items():
            matches = self.team_match_counts[team_id]
            min_met = matches >= self.min_matches
            
            status = "✓" if min_met else "✗"
            print(f"{status} {team_name}: {matches} matches (min: {self.min_matches})")
            
            if not min_met:
                all_constraints_met = False
        
        if all_constraints_met:
            print(f"\n✓ All constraints satisfied!")
            print(f"✓ Total matches scheduled: {len(self.matches)}")
        else:
            print(f"\n⚠ Some constraints not fully satisfied")
        
        print("="*60)

def main():
    parser = argparse.ArgumentParser(description='Team Match Scheduler for 2v2 Alliance Tournament')
    parser.add_argument('--teams', type=int, default=5, 
                       help='Number of teams (default: 5)')
    parser.add_argument('--min-matches', type=int, default=5,
                       help='Minimum matches per team (default: 5)')
    parser.add_argument('--teams-per-alliance', type=int, default=2,
                       help='Number of teams per alliance (default: 2)')
    
    args = parser.parse_args()
    
    # Validate input parameters
    if args.teams < args.teams_per_alliance * 2:
        print(f"Error: Need at least {args.teams_per_alliance * 2} teams for {args.teams_per_alliance}v{args.teams_per_alliance} matches")
        return
    
    if args.teams_per_alliance < 1:
        print("Error: Need at least 1 team per alliance")
        return
    
    
    print(f"Creating schedule for {args.teams} teams")
    print(f"Each team must play at least {args.min_matches} matches")
    print(f"Format: {args.teams_per_alliance}v{args.teams_per_alliance} alliances ({args.teams - (args.teams_per_alliance * 2)} teams sit out each match)")
    print("-" * 60)
    
    scheduler = TeamScheduler(num_teams=args.teams, 
                             min_matches=args.min_matches,
                             teams_per_alliance=args.teams_per_alliance)
    scheduler.schedule_matches()
    scheduler.print_results()

if __name__ == "__main__":
    main()
