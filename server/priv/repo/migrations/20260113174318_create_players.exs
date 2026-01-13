defmodule PandemicVibeServer.Repo.Migrations.CreatePlayers do
  use Ecto.Migration

  def change do
    create table(:players, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :game_id, references(:games, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :role, :string, null: false
      add :current_city_id, references(:cities, type: :binary_id)
      add :turn_order, :integer, null: false
      add :actions_remaining, :integer, default: 4

      timestamps(type: :utc_datetime)
    end

    create index(:players, [:game_id])
    create index(:players, [:user_id])
    create unique_index(:players, [:game_id, :user_id])
    create unique_index(:players, [:game_id, :turn_order])
  end
end
