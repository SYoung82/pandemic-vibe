# Check the state of the WIN game
alias PandemicVibeServer.{Repo, Games}
import Ecto.Query

# Find the WIN game
game = Repo.all(
  from g in Games.Game,
  where: g.name == "Test Game - WIN",
  preload: [:players]
) |> List.first()

if game do
  IO.puts("Found game: #{game.name}")
  IO.puts("Game ID: #{game.id}")
  IO.puts("Status: #{game.status}")

  # Get the game state
  state = Games.get_latest_game_state(game.id)

  IO.puts("\nState data:")
  IO.inspect(state.state_data, pretty: true)

  IO.puts("\nCure markers:")
  IO.inspect(state.state_data["cure_markers"], pretty: true)

  IO.puts("\nPlayers:")
  Enum.each(game.players, fn player ->
    IO.puts("  - Player #{player.id}: Role = #{player.role}")
    cards = Games.list_player_cards(player.id) |> Repo.preload(:city)
    red_cards = Enum.filter(cards, fn card -> card.city && card.city.color == "red" end)
    IO.puts("    Total cards: #{length(cards)}, Red cards: #{length(red_cards)}")
  end)
else
  IO.puts("WIN game not found!")
end
