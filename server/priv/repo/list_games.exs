alias InfestationServer.{Repo, Games}
import Ecto.Query

games = Repo.all(from g in Games.Game, select: {g.name, g.status}, order_by: g.name)

IO.puts("\nAll games:")
Enum.each(games, fn {name, status} ->
  IO.puts("  - #{name}: #{status}")
end)

IO.puts("\nTotal: #{length(games)} games")
