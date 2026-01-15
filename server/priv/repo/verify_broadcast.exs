# Verify what get_current_state returns for the WIN game
alias InfestationServer.{Repo, Games}
alias InfestationServer.GameEngine.GameEngine
import Ecto.Query

# Find the WIN game
game = Repo.all(
  from g in Games.Game,
  where: g.name == "Test Game - WIN"
) |> List.first()

if game do
  IO.puts("Found game: #{game.name}")
  IO.puts("Game ID: #{game.id}")

  # Get what would be broadcast to clients
  {:ok, state} = GameEngine.get_current_state(game.id)

  IO.puts("\nBroadcast data - cure_markers:")
  IO.inspect(state.state["cure_markers"], pretty: true)

  IO.puts("\nFull broadcast state structure:")
  IO.inspect(state, pretty: true, limit: :infinity)
else
  IO.puts("WIN game not found!")
end
