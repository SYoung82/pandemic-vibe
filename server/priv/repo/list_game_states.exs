# List all game states for the WIN game
alias PandemicVibeServer.{Repo, Games}
import Ecto.Query

# Find the WIN game
game = Repo.all(
  from g in Games.Game,
  where: g.name == "Test Game - WIN"
) |> List.first()

if game do
  IO.puts("Found game: #{game.name}")
  IO.puts("Game ID: #{game.id}\n")

  # Get ALL game states
  states = Repo.all(
    from gs in Games.GameState,
    where: gs.game_id == ^game.id,
    order_by: [desc: gs.turn_number, desc: gs.inserted_at]
  )

  IO.puts("Total game states: #{length(states)}\n")

  Enum.with_index(states, 1) |> Enum.each(fn {state, index} ->
    IO.puts("State ##{index}:")
    IO.puts("  ID: #{state.id}")
    IO.puts("  Turn: #{state.turn_number}")
    IO.puts("  Inserted at: #{state.inserted_at}")
    IO.puts("  Updated at: #{state.updated_at}")
    IO.puts("  Cure markers: #{inspect(state.state_data["cure_markers"])}")
    IO.puts("")
  end)

  # Show which one get_latest_game_state returns
  latest = Games.get_latest_game_state(game.id)
  IO.puts("get_latest_game_state returns:")
  IO.puts("  ID: #{latest.id}")
  IO.puts("  Cure markers: #{inspect(latest.state_data["cure_markers"])}")
else
  IO.puts("WIN game not found!")
end
