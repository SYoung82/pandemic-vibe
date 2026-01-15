defmodule PandemicVibeServer.Repo.Migrations.AddNameToGames do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add :name, :string
    end
  end
end
