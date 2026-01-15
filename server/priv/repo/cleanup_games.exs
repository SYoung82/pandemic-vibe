# Clean up all games and related data
alias PandemicVibeServer.{Repo, Games}

IO.puts("Cleaning up all games...")

# Delete all games (cascades to players, game_states, cards, etc)
{count, _} = Repo.delete_all(Games.Game)

IO.puts("✓ Deleted #{count} games and all related data")
IO.puts("Database is now clean!")
