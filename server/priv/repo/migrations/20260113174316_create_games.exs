defmodule PandemicVibeServer.Repo.Migrations.CreateGames do
  use Ecto.Migration

  def change do
    create table(:games, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :status, :string, null: false, default: "lobby"
      add :difficulty, :string, null: false, default: "normal"
      add :outbreak_count, :integer, default: 0
      add :infection_rate_index, :integer, default: 0
      add :research_stations_remaining, :integer, default: 6
      add :created_by_id, references(:users, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:games, [:created_by_id])
    create index(:games, [:status])
  end
end
